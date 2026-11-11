"""Agent graph (Task 2.2): classify, memory, think/tools loop, with handoff and persistence.

Observability: every node is wrapped by ``_timed`` (agent_graph_node_duration_seconds), the
``think`` node records LLM calls/latency/tokens, ``execute_tools`` records per-tool latency and
error class, and the per-turn aggregates (tools used, LLM usage, handoff reason) are carried in
the state so ``app.runner`` can emit one ``agent_conversation_turns_total`` per request.
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.handoff import handoff_reason, needs_handoff
from app.analytics import ANALYTICS, classify_tool_error
from app.i18n import LANGUAGE_NAMES, detect_language, get_localized_message
from app.llm.base import LLMProvider, ToolCall
from app.memory import InMemorySessionStore, LongTermMemory, SessionBackend
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
    # --- per-turn telemetry (read by app.runner) ---
    tools_used: list[str]
    llm_usage: dict[str, int]
    handoff_reason: str


def _approx_tokens(messages: list[dict[str, Any]]) -> int:
    """~4 chars/token heuristic used when the provider does not return `usage`."""
    chars = 0
    for m in messages:
        chars += len(str(m.get("content") or ""))
        if m.get("tool_calls"):
            chars += len(json.dumps(m["tool_calls"]))
    return chars // 4


def _timed(name: str, fn: Callable[[AgentState], Awaitable[AgentState]]):
    async def wrapper(state: AgentState) -> AgentState:
        t0 = time.perf_counter()
        try:
            return await fn(state)
        finally:
            ANALYTICS.record_node(name, time.perf_counter() - t0)

    wrapper.__name__ = getattr(fn, "__name__", name)
    return wrapper


def build_graph(
    llm: LLMProvider,
    tools: ToolRegistry,
    session_store: SessionBackend | None = None,
    memory: LongTermMemory | None = None,
    tickets: InMemoryTicketStore | None = None,
    notifier: Callable[[Ticket], Awaitable[Any]] | None = None,
):
    model_name = str(getattr(llm, "model", "") or type(llm).__name__)
    session_tier = "fallback" if isinstance(session_store, InMemorySessionStore) else "redis"

    def _tenant(state: AgentState) -> str:
        return (state.get("meta") or {}).get("tenant_id") or "default"

    def _channel(state: AgentState) -> str:
        return state.get("channel") or "unknown"

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
        t0 = time.perf_counter()
        try:
            try:
                memories = await memory.search(
                    state["session_id"], state["user_input"], tenant_id=t_id
                )
            except TypeError:
                memories = await memory.search(state["session_id"], state["user_input"])
            ANALYTICS.record_memory("pgvector", time.perf_counter() - t0, bool(memories))
            return {"memories": memories}
        except Exception:  # noqa: BLE001 - memory is best-effort
            log.warning("long-term memory search failed", exc_info=True)
            ANALYTICS.record_memory("pgvector", time.perf_counter() - t0, False)
            ANALYTICS.record_fallback("memory_search", sticky=False)
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
        history: list[dict] = []
        if session_store:
            t0 = time.perf_counter()
            history = await session_store.get(state["session_id"], tenant_id=t_id)
            ANALYTICS.record_memory(session_tier, time.perf_counter() - t0, bool(history))
        msgs = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": state["user_input"]},
        ]
        return {
            "messages": msgs,
            "rounds": 0,
            "lang": lang,
            "tools_used": [],
            "llm_usage": {"calls": 0, "prompt": 0, "completion": 0},
        }

    async def think(state: AgentState) -> AgentState:
        rounds = state["rounds"]
        # After MAX_TOOL_ROUNDS we stop offering tools to force a final text answer.
        schemas = tools.schemas() if rounds < MAX_TOOL_ROUNDS else []
        channel, t_id = _channel(state), _tenant(state)
        t0 = time.perf_counter()
        try:
            r = await llm.chat(state["messages"], tools=schemas or None)
        except Exception:
            ANALYTICS.record_llm(
                model=model_name,
                duration=time.perf_counter() - t0,
                success=False,
                channel=channel,
                tenant_id=t_id,
            )
            raise
        usage = getattr(r, "usage", None) or {}
        prompt = int(usage.get("prompt_tokens", 0) or 0)
        completion = int(usage.get("completion_tokens", 0) or 0)
        ANALYTICS.record_llm(
            model=model_name,
            duration=time.perf_counter() - t0,
            success=True,
            prompt_tokens=prompt,
            completion_tokens=completion,
            context_tokens=prompt or _approx_tokens(state["messages"]),
            channel=channel,
            tenant_id=t_id,
        )
        acc = dict(state.get("llm_usage") or {})
        acc["calls"] = acc.get("calls", 0) + 1
        acc["prompt"] = acc.get("prompt", 0) + prompt
        acc["completion"] = acc.get("completion", 0) + completion
        return {
            "tool_calls": r.tool_calls,
            "response": r.content,
            "rounds": rounds + 1,
            "llm_usage": acc,
        }

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
        channel, t_id = _channel(state), _tenant(state)
        used = list(state.get("tools_used") or [])
        for c in calls:
            tool = tools.get(c.name)
            t0 = time.perf_counter()
            success = True
            error_type: str | None = None
            result: Any = None
            try:
                result = await tool.run(**c.arguments) if tool else f"error: unknown tool {c.name}"
                if str(result).startswith("error:"):
                    success = False
                    error_type = classify_tool_error(None, result)
            except Exception as exc:  # noqa: BLE001
                success = False
                error_type = classify_tool_error(exc)
                log.warning("tool %s failed", c.name, exc_info=True)
                result = f"error: {exc}"
            finally:
                ANALYTICS.record_tool(
                    tool=c.name,
                    duration=time.perf_counter() - t0,
                    success=success,
                    error_type=error_type,
                    channel=channel,
                    tenant_id=t_id,
                    session_id=state["session_id"],
                )
            used.append(c.name)

            msgs.append(
                {
                    "role": "tool",
                    "tool_call_id": c.id,
                    "content": str(result)[:MAX_TOOL_RESULT_CHARS],
                }
            )
        return {"messages": msgs, "tool_calls": [], "tools_used": used}

    async def handoff(state: AgentState) -> AgentState:
        sid, text = state["session_id"], state["user_input"]
        t_id = _tenant(state)
        reason = handoff_reason(text)
        ANALYTICS.record_handoff(
            channel=_channel(state), tenant_id=t_id, reason=reason, session_id=sid
        )
        if tickets:
            history = await session_store.get(sid, tenant_id=t_id) if session_store else []
            ticket = await tickets.create(
                sid,
                state.get("channel", "unknown"),
                state.get("meta") or {},
                [*history, {"role": "user", "content": text}],
                reason="sensitive request detected",
                tenant_id=t_id,
                reason_code=reason,
            )
            if notifier:
                await notifier(ticket)
        lang = state.get("lang") or detect_language(text)
        return {"response": get_localized_message("handoff", lang), "handoff_reason": reason}

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
                ANALYTICS.record_fallback("memory_write", sticky=False)
        return {}

    g = StateGraph(AgentState)
    g.add_node("classify_intent", _timed("classify_intent", classify_intent))
    g.add_node("retrieve_memory", _timed("retrieve_memory", retrieve_memory))
    g.add_node("prepare", _timed("prepare", prepare))
    g.add_node("think", _timed("think", think))
    g.add_node("execute_tools", _timed("execute_tools", execute_tools))
    g.add_node("handoff", _timed("handoff", handoff))
    g.add_node("paused", _timed("paused", paused))
    g.add_node("save_turn", _timed("save_turn", save_turn))
    g.set_entry_point("classify_intent")
    g.add_conditional_edges(
        "classify_intent",
        lambda s: "paused" if s["paused"] else "handoff" if s["handoff"] else "retrieve_memory",
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
