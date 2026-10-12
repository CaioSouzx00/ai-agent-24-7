"""Agent graph (Task 2.2): classify, memory, think/tools loop, with handoff and persistence."""

from __future__ import annotations

import json
import logging
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.handoff import needs_handoff
from app.llm.base import LLMProvider, ToolCall
from app.memory import LongTermMemory, SessionBackend
from app.tools.base import ToolRegistry

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5
MAX_TOOL_RESULT_CHARS = 4000


class AgentState(TypedDict, total=False):
    session_id: str
    user_input: str
    intent: str
    memories: list[str]
    messages: list[dict[str, Any]]
    tool_calls: list[ToolCall]
    rounds: int
    response: str
    handoff: bool


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

    async def prepare(state: AgentState) -> AgentState:
        system = "You are a helpful assistant."
        if state.get("memories"):
            system += "\nRelevant past context:\n" + "\n".join(state["memories"])
        history = await session_store.get(state["session_id"]) if session_store else []
        msgs = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": state["user_input"]},
        ]
        return {"messages": msgs, "rounds": 0}

    async def think(state: AgentState) -> AgentState:
        rounds = state["rounds"]
        # After MAX_TOOL_ROUNDS we stop offering tools to force a final text answer.
        schemas = tools.schemas() if rounds < MAX_TOOL_ROUNDS else []
        r = await llm.chat(state["messages"], tools=schemas or None)
        return {"tool_calls": r.tool_calls, "response": r.content, "rounds": rounds + 1}

    async def execute_tools(state: AgentState) -> AgentState:
        calls = [
            ToolCall(c.name, c.arguments, c.id or f"call_{state['rounds']}_{i}")
            for i, c in enumerate(state["tool_calls"])
        ]
        msgs = list(state["messages"])
        msgs.append(
            {
                "role": "assistant",
                "content": state.get("response") or None,
                "tool_calls": [
                    {
                        "id": c.id,
                        "type": "function",
                        "function": {"name": c.name, "arguments": json.dumps(c.arguments)},
                    }
                    for c in calls
                ],
            }
        )
        for c in calls:
            tool = tools.get(c.name)
            try:
                result = await tool.run(**c.arguments) if tool else f"error: unknown tool {c.name}"
            except Exception as exc:  # noqa: BLE001
                log.warning("tool %s failed", c.name, exc_info=True)
                result = f"error: {exc}"
            msgs.append(
                {
                    "role": "tool",
                    "tool_call_id": c.id,
                    "content": str(result)[:MAX_TOOL_RESULT_CHARS],
                }
            )
        return {"messages": msgs, "tool_calls": []}

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
    g.add_node("prepare", prepare)
    g.add_node("think", think)
    g.add_node("execute_tools", execute_tools)
    g.add_node("handoff", handoff)
    g.add_node("save_turn", save_turn)
    g.set_entry_point("classify_intent")
    g.add_conditional_edges(
        "classify_intent", lambda s: "handoff" if s["handoff"] else "retrieve_memory"
    )
    g.add_edge("retrieve_memory", "prepare")
    g.add_edge("prepare", "think")
    g.add_conditional_edges(
        "think",
        lambda s: (
            "execute_tools"
            if s.get("tool_calls") and s["rounds"] <= MAX_TOOL_ROUNDS
            else "save_turn"
        ),
    )
    g.add_edge("execute_tools", "think")
    g.add_edge("handoff", "save_turn")
    g.add_edge("save_turn", END)
    return g.compile()
