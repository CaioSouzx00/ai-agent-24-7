"""Agent graph (Task 2.2): classify, memory, think/tools loop, with handoff and persistence."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.handoff import needs_handoff
from app.i18n import LANGUAGE_NAMES, detect_language, get_localized_message
from app.llm.base import LLMProvider, ToolCall
from app.memory import LongTermMemory, SessionBackend
from app.metrics import BUSINESS_TRACKER
from app.tickets import InMemoryTicketStore, Ticket
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
    paused: bool
    channel: str
    meta: dict[str, Any]
    lang: str


def build_graph(
    llm: LLMProvider,
    tools: ToolRegistry,
    session_store: SessionBackend | None = None,
    memory: LongTermMemory | None = None,
    tickets: InMemoryTicketStore | None = None,
    notifier: Callable[[Ticket], Awaitable[Any]] | None = None,
):
    def _tenant(state: AgentState) -> str:
        return (state.get("meta") or {}).get("tenant_id") or "default"

    async def classify_intent(state: AgentState) -> AgentState:
        t_id = _tenant(state)
        if tickets and await tickets.active_for(state["session_id"], tenant_id=t_id):
            return {"intent": "paused", "paused": True, "handoff": True}
        handoff = needs_handoff(state["user_input"])
        return {
            "intent": "sensitive" if handoff else "general",
            "paused": False,
            "handoff": handoff,
        }

    async def paused(state: AgentState) -> AgentState:
        """A human owns this conversation: record the message and stay silent."""
        sid, text = state["session_id"], state["user_input"]
        t_id = _tenant(state)
        ticket = await tickets.active_for(sid, tenant_id=t_id)
        if ticket:
            await tickets.add_message(ticket.id, "user", text)
        if session_store:
            await session_store.append(sid, {"role": "user", "content": text}, tenant_id=t_id)
        return {"response": ""}

    async def retrieve_memory(state: AgentState) -> AgentState:
        if not memory:
            return {"memories": []}
        t_id = _tenant(state)
        try:
            try:
                memories = await memory.search(
                    state["session_id"], state["user_input"], tenant_id=t_id
                )
            except TypeError:
                memories = await memory.search(state["session_id"], state["user_input"])
            return {"memories": memories}
        except Exception:  # noqa: BLE001 - memory is best-effort
            log.warning("long-term memory search failed", exc_info=True)
            return {"memories": []}

    async def prepare(state: AgentState) -> AgentState:
        lang = state.get("lang") or detect_language(state["user_input"])
        lang_name = LANGUAGE_NAMES.get(lang, "English")
        system = (
            f"You are a helpful assistant. Always respond in {lang_name} ({lang}), "
            "matching the user's language consistently."
        )
        if state.get("memories"):
            system += "\nRelevant past context:\n" + "\n".join(state["memories"])
        t_id = _tenant(state)
        history = (
            await session_store.get(state["session_id"], tenant_id=t_id) if session_store else []
        )
        msgs = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": state["user_input"]},
        ]
        return {"messages": msgs, "rounds": 0, "lang": lang}

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
            t0 = time.perf_counter()
            success = True
            try:
                result = await tool.run(**c.arguments) if tool else f"error: unknown tool {c.name}"
                if str(result).startswith("error:"):
                    success = False
            except Exception as exc:  # noqa: BLE001
                success = False
                log.warning("tool %s failed", c.name, exc_info=True)
                result = f"error: {exc}"
            finally:
                duration = time.perf_counter() - t0
                BUSINESS_TRACKER.record_tool(c.name, duration, success)

            msgs.append(
                {
                    "role": "tool",
                    "tool_call_id": c.id,
                    "content": str(result)[:MAX_TOOL_RESULT_CHARS],
                }
            )
        return {"messages": msgs, "tool_calls": []}

    async def handoff(state: AgentState) -> AgentState:
        sid, text = state["session_id"], state["user_input"]
        t_id = _tenant(state)
        BUSINESS_TRACKER.record_handoff(state.get("channel", "unknown"), t_id)
        if tickets:
            history = await session_store.get(sid, tenant_id=t_id) if session_store else []
            ticket = await tickets.create(
                sid,
                state.get("channel", "unknown"),
                state.get("meta") or {},
                [*history, {"role": "user", "content": text}],
                reason="sensitive request detected",
                tenant_id=t_id,
            )
            if notifier:
                await notifier(ticket)
        lang = state.get("lang") or detect_language(text)
        return {"response": get_localized_message("handoff", lang)}

    async def save_turn(state: AgentState) -> AgentState:
        sid, text = state["session_id"], state["user_input"]
        t_id = _tenant(state)
        if session_store:
            await session_store.append(
                sid,
                {"role": "user", "content": text},
                {"role": "assistant", "content": state.get("response", "")},
                tenant_id=t_id,
            )
        if memory and not state.get("handoff"):
            try:
                try:
                    await memory.add(sid, text, tenant_id=t_id)
                except TypeError:
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
    g.add_node("paused", paused)
    g.add_node("save_turn", save_turn)
    g.set_entry_point("classify_intent")
    g.add_conditional_edges(
        "classify_intent",
        lambda s: ("paused" if s["paused"] else "handoff" if s["handoff"] else "retrieve_memory"),
    )
    g.add_edge("paused", END)
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
