"""Agent graph (Task 2.2): classify, memory, plan, tools, respond, with handoff."""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.handoff import needs_handoff
from app.llm.base import LLMProvider, ToolCall
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


def build_graph(llm: LLMProvider, tools: ToolRegistry, memory_retriever=None):
    async def classify_intent(state: AgentState) -> AgentState:
        handoff = needs_handoff(state["user_input"])
        return {"intent": "sensitive" if handoff else "general", "handoff": handoff}

    async def retrieve_memory(state: AgentState) -> AgentState:
        mems = await memory_retriever(state["user_input"]) if memory_retriever else []
        return {"memories": mems}

    async def plan(state: AgentState) -> AgentState:
        system = "You are a helpful assistant."
        if state.get("memories"):
            system += "\nContext:\n" + "\n".join(state["memories"])
        msgs = [
            {"role": "system", "content": system},
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

    g = StateGraph(AgentState)
    g.add_node("classify_intent", classify_intent)
    g.add_node("retrieve_memory", retrieve_memory)
    g.add_node("plan", plan)
    g.add_node("execute_tools", execute_tools)
    g.add_node("respond", respond)
    g.add_node("handoff", handoff)
    g.set_entry_point("classify_intent")
    g.add_conditional_edges(
        "classify_intent", lambda s: "handoff" if s["handoff"] else "retrieve_memory"
    )
    g.add_edge("retrieve_memory", "plan")
    g.add_conditional_edges("plan", lambda s: "execute_tools" if s.get("tool_calls") else END)
    g.add_edge("execute_tools", "respond")
    g.add_edge("respond", END)
    g.add_edge("handoff", END)
    return g.compile()
