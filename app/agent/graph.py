"""Agent graph (Task 2.2): classify, memory, plan, tools, respond, with handoff."""

from __future__ import annotations

import logging
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.handoff import needs_handoff
from app.llm.base import LLMProvider, ToolCall
from app.memory import LongTermMemory, SessionBackend
from app.tools.base import ToolRegistry


class AgentState(TypedDict, total=False):
    session_id: str
    user_input: str
    intent: str
    memories: list[str]
    messages: list[dict[str, Any]]
    tool_calls: list[ToolCall]
    tool_results: list[str]
    response: str
    handoff: bool


log = logging.getLogger(__name__)


def build_graph(
    llm: LLMProvider,
    tools: ToolRegistry,
    session_store: SessionBackend | None = None,
    memory: LongTermMemory | None = None,
):
    async def classify_intent(state: AgentState) -> AgentState:
        handoff = needs_handoff(state["user_input"])
        return {"intent": "sensitive" if handoff else "general", "handoff": handoff}

    async def retrieve_memory(state: AgentState) -> AgentState:
        if not memory:
            return {"memories": []}
        try:
            return {"memories": await memory.search(state["session_id"], state["user_input"])}
        except Exception:  # noqa: BLE001 - memory is best-effort
            log.warning("long-term memory search failed", exc_info=True)
            return {"memories": []}

    async def plan(state: AgentState) -> AgentState:
        system = "You are a helpful assistant."
        if state.get("memories"):
            system += "\nRelevant past context:\n" + "\n".join(state["memories"])
        history = await session_store.get(state["session_id"]) if session_store else []
        msgs = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": state["user_input"]},
        ]
        r = await llm.chat(msgs, tools=tools.schemas() or None)
        return {"messages": msgs, "tool_calls": r.tool_calls, "response": r.content}

    async def execute_tools(state: AgentState) -> AgentState:
        results = []
        for call in state.get("tool_calls", []):
            tool = tools.get(call.name)
            try:
                results.append(await tool.run(**call.arguments) if tool else "unknown tool")
            except Exception as exc:  # noqa: BLE001
                results.append(f"error: {exc}")
        return {"tool_results": results}

    async def respond(state: AgentState) -> AgentState:
        if state.get("tool_results"):
            results = "\n".join(state["tool_results"])
            msgs = state["messages"] + [{"role": "user", "content": "Tool results:\n" + results}]
            return {"response": (await llm.chat(msgs)).content}
        return {}

    async def handoff(state: AgentState) -> AgentState:
        return {"response": "I have forwarded your request to a human agent."}

    async def save_turn(state: AgentState) -> AgentState:
        sid, text = state["session_id"], state["user_input"]
        if session_store:
            await session_store.append(
                sid,
                {"role": "user", "content": text},
                {"role": "assistant", "content": state.get("response", "")},
            )
        if memory and not state.get("handoff"):
            try:
                await memory.add(sid, text)
            except Exception:  # noqa: BLE001 - memory is best-effort
                log.warning("long-term memory write failed", exc_info=True)
        return {}

    g = StateGraph(AgentState)
    g.add_node("classify_intent", classify_intent)
    g.add_node("retrieve_memory", retrieve_memory)
    g.add_node("plan", plan)
    g.add_node("execute_tools", execute_tools)
    g.add_node("respond", respond)
    g.add_node("handoff", handoff)
    g.add_node("save_turn", save_turn)
    g.set_entry_point("classify_intent")
    g.add_conditional_edges(
        "classify_intent", lambda s: "handoff" if s["handoff"] else "retrieve_memory"
    )
    g.add_edge("retrieve_memory", "plan")
    g.add_conditional_edges(
        "plan", lambda s: "execute_tools" if s.get("tool_calls") else "save_turn"
    )
    g.add_edge("execute_tools", "respond")
    g.add_edge("respond", "save_turn")
    g.add_edge("handoff", "save_turn")
    g.add_edge("save_turn", END)
    return g.compile()
