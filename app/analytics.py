"""Sliding-window analytics store powering ``/api/analytics/*`` (Agent Behavior dashboard).

Why not query Prometheus from the API?
  * The dashboard must work without a Prometheus server (dev, single-node installs).
  * Per-conversation views (turns, tools used, handoff reason) need per-event data that
    Prometheus intentionally does not keep (no high-cardinality labels).

Design:
  * Every instrumentation point calls ``ANALYTICS.record_*``. Each call (1) updates the
    Prometheus collectors in :mod:`app.metrics` and (2) appends a compact event to a bounded,
    time-ordered deque. Queries walk deques backwards and stop at the window start.
  * Retention is 60 days (so a 30d view can compare against the previous 30d), capped by
    ``maxlen`` per deque to bound memory (~200k turns ≈ 40-60 MB worst case).
  * Results are cached for a few seconds per (endpoint, params) key.

Limitations (documented on purpose):
  * State is per-process. With N replicas each instance reports its own slice; use the
    Grafana/PromQL panels for fleet-wide numbers, or persist events to Redis/Postgres.
  * Data is lost on restart (Prometheus counters keep the long-term history).
"""

from __future__ import annotations

import math
import random
import threading
import time
from collections import deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Any

from app.metrics import (
    ACTIVE_SESSIONS,
    ACTIVE_TICKETS,
    BUSINESS_TRACKER,
    COMPONENT_DEGRADED,
    CONTEXT_TOKENS,
    CONVERSATION_DURATION,
    CONVERSATION_TURNS,
    FALLBACK_MODE,
    GRAPH_CYCLES,
    GRAPH_CYCLES_PER_REQUEST,
    GRAPH_NODE_DURATION,
    HANDOFF_REASONS,
    HANDOFF_RESOLUTION,
    HANDOFF_WAIT,
    LLM_CALLS,
    LLM_LATENCY,
    LLM_TOKENS,
    MEMORY_HITS,
    MEMORY_MISSES,
    MEMORY_RETRIEVAL,
    SSRF_BLOCKED,
    TICKETS_BY_STATUS,
    TOOL_ERRORS,
    TOOLS_PER_CONVERSATION,
    WEBHOOK_SIGNATURE_FAIL,
)

IDLE_TIMEOUT_SECONDS = 30 * 60
RETENTION_SECONDS = 60 * 86400
CACHE_TTL_SECONDS = 5.0

PERIODS: dict[str, int] = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800, "30d": 2592000}
STEPS: dict[str, int] = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "6h": 21600, "1d": 86400}

AGENT_OUTCOMES = ("autonomous_resolved", "handoff", "error")


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def percentile(values: list[float], q: float) -> float | None:
    """Nearest-rank percentile (q in 0..100). Returns None for empty input."""
    if not values:
        return None
    ordered = sorted(values)
    k = max(0, min(len(ordered) - 1, math.ceil(q / 100 * len(ordered)) - 1))
    return ordered[k]


def _avg(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _ratio(num: int, den: int) -> float | None:
    return num / den if den else None


def _r(v: float | None, nd: int = 4) -> float | None:
    return None if v is None else round(v, nd)


def resolve_window(
    period: str = "24h", from_ts: float | None = None, to_ts: float | None = None
) -> tuple[float, float]:
    now = time.time()
    if from_ts is not None:
        end = to_ts if to_ts is not None else now
        return float(from_ts), float(max(end, from_ts + 60))
    span = PERIODS.get(period, PERIODS["24h"])
    return now - span, now


def auto_step(span: float, target_points: int = 60) -> int:
    for seconds in sorted(STEPS.values()):
        if span / seconds <= target_points * 2:
            return seconds
    return STEPS["1d"]


def classify_tool_error(exc: BaseException | None, result: Any = None) -> str:
    """Bounded error taxonomy for ``agent_tool_error_total{error_type}``."""
    if exc is None:
        text = str(result or "")
        if "unknown tool" in text:
            return "unknown_tool"
        if "security violation" in text or "non-public address" in text:
            return "security"
        if "status " in text and "API returned" in text:
            return "http_error"
        if "timed out" in text.lower() or "timeout" in text.lower():
            return "timeout"
        return "returned_error"
    name = type(exc).__name__.lower()
    if "timeout" in name:
        return "timeout"
    if "unsafeurl" in name:
        return "security"
    if "http" in name or "connect" in name or "network" in name:
        return "http_error"
    if isinstance(exc, (TypeError, ValueError, KeyError)):
        return "bad_arguments"
    return "exception"


# ---------------------------------------------------------------------------
# events
# ---------------------------------------------------------------------------
@dataclass(slots=True)
class TurnEvent:
    ts: float
    session_id: str
    channel: str
    tenant_id: str
    outcome: str
    duration: float
    tool_calls: int = 0
    cycles: int = 0
    llm_calls: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    handoff_reason: str | None = None


@dataclass(slots=True)
class ToolEvent:
    ts: float
    tool: str
    channel: str
    tenant_id: str
    session_id: str
    duration: float
    success: bool
    error_type: str | None = None


@dataclass(slots=True)
class LLMEvent:
    ts: float
    model: str
    channel: str
    tenant_id: str
    duration: float
    success: bool
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass(slots=True)
class HandoffEvent:
    ts: float
    channel: str
    tenant_id: str
    reason: str
    session_id: str


@dataclass(slots=True)
class TicketEvent:
    ts: float
    kind: str  # claimed | resolved
    ticket_id: str
    channel: str
    tenant_id: str
    reason: str
    seconds: float


@dataclass(slots=True)
class HealthEvent:
    ts: float
    kind: str  # fallback | ssrf | signature_fail | rate_limited
    label: str
    channel: str = "system"
    tenant_id: str = "default"


@dataclass(slots=True)
class SampleEvent:
    ts: float
    kind: str  # memory | node
    label: str
    value: float
    hit: bool = True
    channel: str = "system"
    tenant_id: str = "default"


@dataclass
class Conversation:
    id: str
    session_id: str
    tenant_id: str
    channel: str
    started_at: float
    last_at: float
    turns: int = 0
    tool_calls: int = 0
    errors: int = 0
    tools: dict[str, int] = field(default_factory=dict)
    outcome: str = "autonomous_resolved"
    handoff_reason: str | None = None
    handoff_at: float | None = None
    observed: bool = False
    closed: bool = False

    @property
    def duration(self) -> float:
        end = self.handoff_at if self.handoff_at else self.last_at
        return max(0.0, end - self.started_at)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "tenant_id": self.tenant_id,
            "channel": self.channel,
            "started_at": self.started_at,
            "last_at": self.last_at,
            "turns": self.turns,
            "duration_seconds": round(self.duration, 3),
            "tool_calls": self.tool_calls,
            "tools_used": sorted(self.tools, key=lambda t: -self.tools[t]),
            "outcome": self.outcome,
            "handoff_reason": self.handoff_reason,
            "active": not self.closed,
        }


def _match(ev: Any, channel: str | None, tenant_id: str | None) -> bool:
    return (not channel or ev.channel == channel) and (not tenant_id or ev.tenant_id == tenant_id)


# ---------------------------------------------------------------------------
# store
# ---------------------------------------------------------------------------
class AnalyticsStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._turns: deque[TurnEvent] = deque(maxlen=200_000)
        self._tools: deque[ToolEvent] = deque(maxlen=200_000)
        self._llm: deque[LLMEvent] = deque(maxlen=200_000)
        self._handoffs: deque[HandoffEvent] = deque(maxlen=50_000)
        self._tickets: deque[TicketEvent] = deque(maxlen=50_000)
        self._health: deque[HealthEvent] = deque(maxlen=50_000)
        self._samples: deque[SampleEvent] = deque(maxlen=200_000)
        self._active: dict[str, Conversation] = {}
        self._closed: deque[Conversation] = deque(maxlen=10_000)
        self._degraded: set[str] = set()
        self._cache: dict[tuple, tuple[float, Any]] = {}
        self._ticket_gauge_at = 0.0

    # ------------------------------------------------------------------ reset
    def reset(self) -> None:
        with self._lock:
            for dq in (
                self._turns,
                self._tools,
                self._llm,
                self._handoffs,
                self._tickets,
                self._health,
                self._samples,
                self._closed,
            ):
                dq.clear()
            self._active.clear()
            self._cache.clear()

    # --------------------------------------------------------------- recording
    def record_turn(
        self,
        *,
        session_id: str,
        channel: str,
        tenant_id: str,
        outcome: str,
        duration: float,
        tools: Iterable[str] = (),
        cycles: int = 0,
        llm_calls: int = 0,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        handoff_reason: str | None = None,
        ts: float | None = None,
    ) -> None:
        ts = ts if ts is not None else time.time()
        tools = list(tools)
        CONVERSATION_TURNS.labels(channel=channel, tenant_id=tenant_id, outcome=outcome).inc()
        if outcome in AGENT_OUTCOMES:
            if cycles:
                GRAPH_CYCLES.labels(channel=channel).inc(cycles)
            GRAPH_CYCLES_PER_REQUEST.labels(channel=channel).observe(cycles)
        ev = TurnEvent(
            ts,
            session_id,
            channel,
            tenant_id,
            outcome,
            duration,
            len(tools),
            cycles,
            llm_calls,
            prompt_tokens,
            completion_tokens,
            handoff_reason,
        )
        with self._lock:
            self._turns.append(ev)
            if outcome != "rate_limited":
                self._touch_conversation(ev, tools)
            self._sweep(ts)

    def record_tool(
        self,
        *,
        tool: str,
        duration: float,
        success: bool,
        error_type: str | None = None,
        channel: str = "unknown",
        tenant_id: str = "default",
        session_id: str = "",
        ts: float | None = None,
    ) -> None:
        BUSINESS_TRACKER.record_tool(tool, duration, success, channel=channel)
        if not success:
            TOOL_ERRORS.labels(tool_name=tool, error_type=error_type or "exception").inc()
        with self._lock:
            self._tools.append(
                ToolEvent(
                    ts if ts is not None else time.time(),
                    tool,
                    channel,
                    tenant_id,
                    session_id,
                    duration,
                    success,
                    None if success else (error_type or "exception"),
                )
            )

    def record_llm(
        self,
        *,
        model: str,
        duration: float,
        success: bool,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        context_tokens: int = 0,
        channel: str = "unknown",
        tenant_id: str = "default",
        ts: float | None = None,
    ) -> None:
        LLM_CALLS.labels(model=model, status="success" if success else "error").inc()
        LLM_LATENCY.labels(model=model).observe(duration)
        if prompt_tokens:
            LLM_TOKENS.labels(model=model, type="prompt").inc(prompt_tokens)
        if completion_tokens:
            LLM_TOKENS.labels(model=model, type="completion").inc(completion_tokens)
        if context_tokens:
            CONTEXT_TOKENS.labels(channel=channel).observe(context_tokens)
        with self._lock:
            self._llm.append(
                LLMEvent(
                    ts if ts is not None else time.time(),
                    model,
                    channel,
                    tenant_id,
                    duration,
                    success,
                    prompt_tokens,
                    completion_tokens,
                )
            )

    def record_handoff(
        self,
        *,
        channel: str,
        tenant_id: str,
        reason: str,
        session_id: str,
        ts: float | None = None,
    ) -> None:
        reason = reason if reason in HANDOFF_REASONS else "other"
        BUSINESS_TRACKER.record_handoff(channel, tenant_id, reason=reason)
        ts = ts if ts is not None else time.time()
        with self._lock:
            self._handoffs.append(HandoffEvent(ts, channel, tenant_id, reason, session_id))

    def record_ticket(
        self,
        *,
        kind: str,
        ticket_id: str,
        channel: str,
        tenant_id: str,
        reason: str,
        seconds: float,
        ts: float | None = None,
    ) -> None:
        seconds = max(0.0, seconds)
        if kind == "claimed":
            HANDOFF_WAIT.labels(channel=channel).observe(seconds)
        elif kind == "resolved":
            HANDOFF_RESOLUTION.labels(channel=channel).observe(seconds)
        with self._lock:
            self._tickets.append(
                TicketEvent(
                    ts if ts is not None else time.time(),
                    kind,
                    ticket_id,
                    channel,
                    tenant_id,
                    reason,
                    seconds,
                )
            )

    def record_memory(self, tier: str, seconds: float, hit: bool, ts: float | None = None) -> None:
        MEMORY_RETRIEVAL.labels(tier=tier).observe(seconds)
        (MEMORY_HITS if hit else MEMORY_MISSES).labels(tier=tier).inc()
        with self._lock:
            self._samples.append(
                SampleEvent(ts if ts is not None else time.time(), "memory", tier, seconds, hit)
            )

    def record_node(self, node: str, seconds: float, ts: float | None = None) -> None:
        GRAPH_NODE_DURATION.labels(node=node).observe(seconds)
        with self._lock:
            self._samples.append(
                SampleEvent(ts if ts is not None else time.time(), "node", node, seconds)
            )

    def _health_event(self, kind: str, label: str, channel: str = "system") -> None:
        with self._lock:
            self._health.append(HealthEvent(time.time(), kind, label, channel))

    def record_fallback(self, component: str, sticky: bool = True) -> None:
        """``sticky`` = the component stays degraded (startup fallback) vs. a transient
        runtime failure that only increments the counter."""
        FALLBACK_MODE.labels(component=component).inc()
        if sticky:
            COMPONENT_DEGRADED.labels(component=component).set(1)
            with self._lock:
                self._degraded.add(component)
        self._health_event("fallback", component)

    def clear_fallback(self, component: str) -> None:
        COMPONENT_DEGRADED.labels(component=component).set(0)
        with self._lock:
            self._degraded.discard(component)

    def record_ssrf_blocked(self) -> None:
        SSRF_BLOCKED.inc()
        self._health_event("ssrf", "ssrf")

    def record_signature_fail(self, channel: str) -> None:
        WEBHOOK_SIGNATURE_FAIL.labels(channel=channel).inc()
        self._health_event("signature_fail", channel, channel)

    def record_rate_limited(
        self,
        identifier_type: str,
        *,
        channel: str | None = None,
        tenant_id: str = "default",
        session_id: str = "",
    ) -> None:
        """Called next to ``RATELIMIT_EXCEEDED``. When ``channel`` is given the rejection was a
        chat turn, so it is also counted as a turn with outcome=rate_limited."""
        self._health_event("rate_limited", identifier_type, channel or "system")
        if channel:
            self.record_turn(
                session_id=session_id or "unknown",
                channel=channel,
                tenant_id=tenant_id,
                outcome="rate_limited",
                duration=0.0,
            )

    # ------------------------------------------------------------ conversations
    def _touch_conversation(self, ev: TurnEvent, tools: list[str]) -> None:
        key = f"{ev.tenant_id}:{ev.session_id}"
        conv = self._active.get(key)
        if conv and ev.ts - conv.last_at > IDLE_TIMEOUT_SECONDS:
            self._close(key, conv)
            conv = None
        if conv is None:
            conv = Conversation(
                id=f"{ev.session_id}@{int(ev.ts)}",
                session_id=ev.session_id,
                tenant_id=ev.tenant_id,
                channel=ev.channel,
                started_at=ev.ts - ev.duration,
                last_at=ev.ts,
            )
            self._active[key] = conv
        conv.turns += 1
        conv.last_at = ev.ts
        conv.tool_calls += len(tools)
        for t in tools:
            conv.tools[t] = conv.tools.get(t, 0) + 1
        if ev.outcome == "handoff":
            conv.outcome = "handoff"
            conv.handoff_reason = ev.handoff_reason
            conv.handoff_at = ev.ts
            self._observe_conversation(conv)  # duration stops at handoff
        elif ev.outcome == "error":
            conv.errors += 1
            if conv.outcome != "handoff":
                conv.outcome = "error"
        elif ev.outcome == "autonomous_resolved" and conv.outcome == "error":
            conv.outcome = "autonomous_resolved"  # recovered on a later turn
        elif ev.outcome == "human_active" and conv.outcome != "handoff":
            conv.outcome = "handoff"

    def _observe_conversation(self, conv: Conversation) -> None:
        if conv.observed:
            return
        conv.observed = True
        CONVERSATION_DURATION.labels(channel=conv.channel).observe(conv.duration)
        TOOLS_PER_CONVERSATION.observe(conv.tool_calls)

    def _close(self, key: str, conv: Conversation) -> None:
        self._observe_conversation(conv)
        conv.closed = True
        self._closed.append(conv)
        self._active.pop(key, None)

    def _sweep(self, now: float | None = None) -> None:
        now = now if now is not None else time.time()
        for key, conv in list(self._active.items()):
            if now - conv.last_at > IDLE_TIMEOUT_SECONDS:
                self._close(key, conv)
        ACTIVE_SESSIONS.set(len(self._active))
        cutoff = now - RETENTION_SECONDS
        for dq in (self._turns, self._tools, self._llm, self._handoffs, self._tickets):
            while dq and dq[0].ts < cutoff:
                dq.popleft()

    # ---------------------------------------------------------------- querying
    @staticmethod
    def _window(
        dq: deque, start: float, end: float, channel: str | None = None, tenant: str | None = None
    ) -> list:
        out = []
        for ev in reversed(dq):
            if ev.ts < start:
                break
            if ev.ts <= end and _match(ev, channel, tenant):
                out.append(ev)
        out.reverse()
        return out

    def _cached(self, key: tuple, fn: Callable[[], Any]) -> Any:
        now = time.monotonic()
        hit = self._cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
        value = fn()
        self._cache[key] = (now + CACHE_TTL_SECONDS, value)
        if len(self._cache) > 256:
            for k in [k for k, (exp, _) in self._cache.items() if exp <= now]:
                self._cache.pop(k, None)
        return value

    # ------------------------------------------------------------------ summary
    @staticmethod
    def _turn_stats(turns: list[TurnEvent]) -> dict[str, Any]:
        outcomes = {o: 0 for o in (*AGENT_OUTCOMES, "rate_limited", "human_active")}
        durations: list[float] = []
        tool_calls = llm_calls = prompt = completion = 0
        sessions: set[str] = set()
        for t in turns:
            outcomes[t.outcome] = outcomes.get(t.outcome, 0) + 1
            if t.outcome in AGENT_OUTCOMES:
                durations.append(t.duration)
                sessions.add(f"{t.tenant_id}:{t.session_id}")
            tool_calls += t.tool_calls
            llm_calls += t.llm_calls
            prompt += t.prompt_tokens
            completion += t.completion_tokens
        agent_turns = sum(outcomes[o] for o in AGENT_OUTCOMES)
        return {
            "volume": len(turns),
            "agent_turns": agent_turns,
            "conversations": len(sessions),
            "outcomes": outcomes,
            "autonomous_rate": _r(_ratio(outcomes["autonomous_resolved"], agent_turns)),
            "handoff_rate": _r(_ratio(outcomes["handoff"], agent_turns)),
            "error_rate": _r(_ratio(outcomes["error"], agent_turns)),
            "rate_limited": outcomes["rate_limited"],
            "latency": {
                "avg": _r(_avg(durations)),
                "p50": _r(percentile(durations, 50)),
                "p95": _r(percentile(durations, 95)),
                "p99": _r(percentile(durations, 99)),
                "max": _r(max(durations) if durations else None),
            },
            "tool_calls": tool_calls,
            "avg_tools_per_turn": _r(_ratio(tool_calls, agent_turns), 3),
            "llm_calls": llm_calls,
            "tokens": {"prompt": prompt, "completion": completion},
        }

    @staticmethod
    def _tool_ranking(events: list[ToolEvent]) -> list[dict[str, Any]]:
        by_tool: dict[str, list[ToolEvent]] = {}
        for e in events:
            by_tool.setdefault(e.tool, []).append(e)
        rows = []
        for name, evs in by_tool.items():
            durs = [e.duration for e in evs]
            errors = [e for e in evs if not e.success]
            err_types: dict[str, int] = {}
            channels: dict[str, int] = {}
            for e in errors:
                et = e.error_type or "exception"
                err_types[et] = err_types.get(et, 0) + 1
            for e in evs:
                channels[e.channel] = channels.get(e.channel, 0) + 1
            rows.append(
                {
                    "tool": name,
                    "calls": len(evs),
                    "errors": len(errors),
                    "error_rate": _r(_ratio(len(errors), len(evs))) or 0.0,
                    "latency": {
                        "avg": _r(_avg(durs)),
                        "p50": _r(percentile(durs, 50)),
                        "p95": _r(percentile(durs, 95)),
                        "p99": _r(percentile(durs, 99)),
                        "max": _r(max(durs)),
                    },
                    "error_types": err_types,
                    "channels": channels,
                    "last_called_at": evs[-1].ts,
                    "last_error_at": errors[-1].ts if errors else None,
                }
            )
        rows.sort(key=lambda r: r["calls"], reverse=True)
        return rows

    def summary(
        self,
        period: str = "24h",
        channel: str | None = None,
        tenant_id: str | None = None,
        from_ts: float | None = None,
        to_ts: float | None = None,
    ) -> dict[str, Any]:
        key = ("summary", period, channel, tenant_id, from_ts, to_ts)
        return self._cached(key, lambda: self._summary(period, channel, tenant_id, from_ts, to_ts))

    def _summary(self, period, channel, tenant_id, from_ts, to_ts) -> dict[str, Any]:
        start, end = resolve_window(period, from_ts, to_ts)
        span = end - start
        with self._lock:
            self._sweep()
            turns = self._window(self._turns, start, end, channel, tenant_id)
            prev_turns = self._window(self._turns, start - span, start, channel, tenant_id)
            tools = self._window(self._tools, start, end, channel, tenant_id)
            llm = self._window(self._llm, start, end, channel, tenant_id)
            handoffs = self._window(self._handoffs, start, end, channel, tenant_id)
            tickets = self._window(self._tickets, start, end, channel, tenant_id)
            health = self._window(self._health, start, end)
            samples = self._window(self._samples, start, end)
            active_sessions = sum(
                1 for c in self._active.values() if _match(c, channel, tenant_id) and not c.closed
            )
            all_channels = sorted({t.channel for t in self._turns} | {"rest", "ws"})
            all_tenants = sorted({t.tenant_id for t in self._turns} | {"default"})
            degraded = sorted(self._degraded)

        core = self._turn_stats(turns)
        prev = self._turn_stats(prev_turns)

        # tools
        ranking = self._tool_ranking(tools)
        tool_errors = sum(r["errors"] for r in ranking)

        # handoffs
        by_reason = {r: 0 for r in HANDOFF_REASONS}
        by_channel: dict[str, int] = {}
        for h in handoffs:
            by_reason[h.reason] = by_reason.get(h.reason, 0) + 1
            by_channel[h.channel] = by_channel.get(h.channel, 0) + 1
        waits = [t.seconds for t in tickets if t.kind == "claimed"]
        resolutions = [t.seconds for t in tickets if t.kind == "resolved"]

        # llm
        llm_by_model: dict[str, dict[str, Any]] = {}
        for e in llm:
            m = llm_by_model.setdefault(
                e.model, {"calls": 0, "errors": 0, "durations": [], "prompt": 0, "completion": 0}
            )
            m["calls"] += 1
            m["errors"] += 0 if e.success else 1
            m["durations"].append(e.duration)
            m["prompt"] += e.prompt_tokens
            m["completion"] += e.completion_tokens
        llm_durs = [e.duration for e in llm]

        # health
        def _count(kind: str) -> dict[str, int]:
            out: dict[str, int] = {}
            for h in health:
                if h.kind == kind and (
                    kind not in ("rate_limited", "signature_fail")
                    or not channel
                    or h.channel in (channel, "system")
                ):
                    out[h.label] = out.get(h.label, 0) + 1
            return out

        def _sample_stats(kind: str) -> dict[str, dict[str, Any]]:
            groups: dict[str, list[SampleEvent]] = {}
            for s in samples:
                if s.kind == kind:
                    groups.setdefault(s.label, []).append(s)
            out = {}
            for label, evs in groups.items():
                vals = [e.value for e in evs]
                out[label] = {
                    "count": len(evs),
                    "avg": _r(_avg(vals), 5),
                    "p95": _r(percentile(vals, 95), 5),
                    "hit_rate": _r(_ratio(sum(1 for e in evs if e.hit), len(evs))),
                }
            return out

        rate_limited_by_id = _count("rate_limited")
        step = auto_step(span, target_points=24)
        sparks = self._sparklines(turns, tools, health, start, end, step)

        return {
            "period": period if from_ts is None else "custom",
            "window": {"start": start, "end": end, "step_seconds": step},
            "filters": {"channel": channel, "tenant_id": tenant_id},
            "generated_at": time.time(),
            **core,
            "active_sessions": active_sessions,
            "previous": {
                "volume": prev["volume"],
                "conversations": prev["conversations"],
                "autonomous_rate": prev["autonomous_rate"],
                "handoff_rate": prev["handoff_rate"],
                "error_rate": prev["error_rate"],
                "latency_p95": prev["latency"]["p95"],
                "rate_limited": prev["rate_limited"],
            },
            "tools": {
                "total_calls": len(tools),
                "errors": tool_errors,
                "error_rate": _r(_ratio(tool_errors, len(tools))),
                "top": ranking[:10],
            },
            "handoffs": {
                "total": len(handoffs),
                "by_reason": by_reason,
                "by_channel": by_channel,
                "avg_wait_seconds": _r(_avg(waits), 2),
                "p95_wait_seconds": _r(percentile(waits, 95), 2),
                "avg_resolution_seconds": _r(_avg(resolutions), 2),
                "claimed": len(waits),
                "resolved": len(resolutions),
            },
            "llm": {
                "calls": len(llm),
                "errors": sum(1 for e in llm if not e.success),
                "latency": {
                    "avg": _r(_avg(llm_durs)),
                    "p50": _r(percentile(llm_durs, 50)),
                    "p95": _r(percentile(llm_durs, 95)),
                },
                "tokens": {
                    "prompt": sum(e.prompt_tokens for e in llm),
                    "completion": sum(e.completion_tokens for e in llm),
                },
                "by_model": {
                    name: {
                        "calls": m["calls"],
                        "errors": m["errors"],
                        "p95": _r(percentile(m["durations"], 95)),
                        "prompt_tokens": m["prompt"],
                        "completion_tokens": m["completion"],
                    }
                    for name, m in llm_by_model.items()
                },
            },
            "health": {
                "fallback_events": _count("fallback"),
                "degraded_components": degraded,
                "ssrf_blocked": sum(_count("ssrf").values()),
                "signature_failures": _count("signature_fail"),
                "rate_limited_by_identifier": rate_limited_by_id,
                "rate_limited_total": sum(rate_limited_by_id.values()),
                "memory": _sample_stats("memory"),
                "graph_nodes": _sample_stats("node"),
            },
            "sparklines": sparks,
            "dimensions": {"channels": all_channels, "tenants": all_tenants},
        }

    def _sparklines(self, turns, tools, health, start, end, step) -> dict[str, list[dict]]:
        b0 = math.floor(start / step) * step
        n = max(1, math.ceil((end - b0) / step))
        buckets: list[list[TurnEvent]] = [[] for _ in range(n)]
        tool_b = [[0, 0] for _ in range(n)]
        rl_b = [0] * n
        for t in turns:
            buckets[min(n - 1, int((t.ts - b0) // step))].append(t)
        for e in tools:
            i = min(n - 1, int((e.ts - b0) // step))
            tool_b[i][0] += 1
            tool_b[i][1] += 0 if e.success else 1
        for h in health:
            if h.kind == "rate_limited":
                rl_b[min(n - 1, max(0, int((h.ts - b0) // step)))] += 1
        out: dict[str, list[dict]] = {
            k: [] for k in ("requests", "autonomous_rate", "handoff_rate", "latency_p95")
        }
        out["tool_error_rate"] = []
        out["rate_limited"] = []
        for i, bucket in enumerate(buckets):
            ts = b0 + i * step
            agent = [t for t in bucket if t.outcome in AGENT_OUTCOMES]
            out["requests"].append({"ts": ts, "value": len(bucket)})
            out["autonomous_rate"].append(
                {
                    "ts": ts,
                    "value": _r(
                        _ratio(sum(t.outcome == "autonomous_resolved" for t in agent), len(agent))
                    ),
                }
            )
            out["handoff_rate"].append(
                {
                    "ts": ts,
                    "value": _r(_ratio(sum(t.outcome == "handoff" for t in agent), len(agent))),
                }
            )
            out["latency_p95"].append(
                {"ts": ts, "value": _r(percentile([t.duration for t in agent], 95))}
            )
            out["tool_error_rate"].append(
                {"ts": ts, "value": _r(_ratio(tool_b[i][1], tool_b[i][0]))}
            )
            out["rate_limited"].append({"ts": ts, "value": rl_b[i]})
        return out

    # --------------------------------------------------------------- timeseries
    TIMESERIES_METRICS = (
        "requests",
        "handoffs",
        "latency_p50",
        "latency_p95",
        "latency_p99",
        "tool_calls",
        "tool_errors",
        "autonomous_rate",
        "handoff_rate",
        "error_rate",
        "rate_limited",
        "queue_wait",
        "llm_calls",
        "llm_latency_p95",
        "memory_latency_p95",
        "conversations",
    )
    GROUPABLE = {
        "requests": ("channel", "outcome", "tenant_id"),
        "handoffs": ("channel", "reason", "tenant_id"),
        "latency_p50": ("channel",),
        "latency_p95": ("channel",),
        "latency_p99": ("channel",),
        "tool_calls": ("tool", "channel"),
        "tool_errors": ("tool", "error_type"),
        "autonomous_rate": ("channel",),
        "handoff_rate": ("channel",),
        "error_rate": ("channel",),
        "rate_limited": ("label",),
        "queue_wait": ("channel",),
        "llm_calls": ("model",),
        "llm_latency_p95": ("model",),
        "memory_latency_p95": ("label",),
        "conversations": ("channel",),
    }

    def timeseries(
        self,
        metric: str,
        period: str = "24h",
        step: str | None = None,
        channel: str | None = None,
        tenant_id: str | None = None,
        group_by: str | None = None,
        from_ts: float | None = None,
        to_ts: float | None = None,
    ) -> dict[str, Any]:
        if metric not in self.TIMESERIES_METRICS:
            raise ValueError(f"unsupported metric '{metric}'")
        if group_by and group_by not in self.GROUPABLE.get(metric, ()):
            raise ValueError(f"metric '{metric}' cannot be grouped by '{group_by}'")
        key = ("ts", metric, period, step, channel, tenant_id, group_by, from_ts, to_ts)
        return self._cached(
            key,
            lambda: self._timeseries(
                metric, period, step, channel, tenant_id, group_by, from_ts, to_ts
            ),
        )

    def _timeseries(
        self, metric, period, step, channel, tenant_id, group_by, from_ts, to_ts
    ) -> dict[str, Any]:
        start, end = resolve_window(period, from_ts, to_ts)
        step_s = STEPS.get(step or "", 0) or auto_step(end - start)
        # never return more than ~720 points
        while (end - start) / step_s > 720:
            step_s *= 2

        with self._lock:
            if metric in (
                "requests",
                "latency_p50",
                "latency_p95",
                "latency_p99",
                "autonomous_rate",
                "handoff_rate",
                "error_rate",
                "conversations",
            ):
                events = self._window(self._turns, start, end, channel, tenant_id)
            elif metric == "handoffs":
                events = self._window(self._handoffs, start, end, channel, tenant_id)
            elif metric in ("tool_calls", "tool_errors"):
                events = self._window(self._tools, start, end, channel, tenant_id)
            elif metric == "rate_limited":
                events = [
                    h
                    for h in self._window(self._health, start, end)
                    if h.kind == "rate_limited" and (not channel or h.channel == channel)
                ]
            elif metric == "queue_wait":
                events = [
                    t
                    for t in self._window(self._tickets, start, end, channel, tenant_id)
                    if t.kind == "claimed"
                ]
            elif metric in ("llm_calls", "llm_latency_p95"):
                events = self._window(self._llm, start, end, channel, tenant_id)
            else:  # memory_latency_p95
                events = [s for s in self._window(self._samples, start, end) if s.kind == "memory"]

        def reducer(evs: list) -> float | None:
            if metric in ("requests", "handoffs", "tool_calls", "llm_calls", "rate_limited"):
                return len(evs)
            if metric == "tool_errors":
                return sum(1 for e in evs if not e.success)
            if metric == "conversations":
                return len({f"{e.tenant_id}:{e.session_id}" for e in evs})
            if metric.startswith("latency_"):
                q = float(metric.split("_p")[1])
                return _r(percentile([e.duration for e in evs if e.outcome in AGENT_OUTCOMES], q))
            if metric in ("autonomous_rate", "handoff_rate", "error_rate"):
                target = {
                    "autonomous_rate": "autonomous_resolved",
                    "handoff_rate": "handoff",
                    "error_rate": "error",
                }[metric]
                agent = [e for e in evs if e.outcome in AGENT_OUTCOMES]
                return _r(_ratio(sum(e.outcome == target for e in agent), len(agent)))
            if metric == "queue_wait":
                return _r(_avg([e.seconds for e in evs]), 2)
            if metric == "llm_latency_p95":
                return _r(percentile([e.duration for e in evs], 95))
            if metric == "memory_latency_p95":
                return _r(percentile([e.value for e in evs], 95), 5)
            return None

        def label_of(ev: Any) -> str:
            if group_by == "tool":
                return ev.tool
            return str(getattr(ev, group_by, "") or "unknown")

        b0 = math.floor(start / step_s) * step_s
        n = max(1, math.ceil((end - b0) / step_s))
        groups: dict[str, list[list]] = {}
        for ev in events:
            if metric == "tool_errors" and group_by == "error_type" and ev.success:
                continue
            g = label_of(ev) if group_by else "__all__"
            bucket_list = groups.setdefault(g, [[] for _ in range(n)])
            bucket_list[min(n - 1, max(0, int((ev.ts - b0) // step_s)))].append(ev)
        if not groups:
            groups["__all__"] = [[] for _ in range(n)]

        points = []
        for g, buckets in sorted(groups.items()):
            for i, evs in enumerate(buckets):
                p: dict[str, Any] = {"ts": b0 + i * step_s, "value": reducer(evs)}
                if group_by:
                    p["labels"] = {group_by: g}
                points.append(p)
        return {
            "metric": metric,
            "period": period if from_ts is None else "custom",
            "step_seconds": step_s,
            "start": start,
            "end": end,
            "group_by": group_by,
            "points": points,
        }

    # ------------------------------------------------------------ conversations
    def conversations(
        self,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        channel: str | None = None,
        tenant_id: str | None = None,
        from_ts: float | None = None,
        to_ts: float | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            self._sweep()
            convs = [*self._active.values(), *self._closed]
            rows = [c.to_dict() for c in convs]
        rows = [
            r
            for r in rows
            if (not status or r["outcome"] == status or (status == "active" and r["active"]))
            and (not channel or r["channel"] == channel)
            and (not tenant_id or r["tenant_id"] == tenant_id)
            and (from_ts is None or r["last_at"] >= from_ts)
            and (to_ts is None or r["started_at"] <= to_ts)
        ]
        rows.sort(key=lambda r: r["last_at"], reverse=True)
        dist: dict[str, int] = {}
        for r in rows:
            k = str(min(r["tool_calls"], 10)) if r["tool_calls"] < 10 else "10+"
            dist[k] = dist.get(k, 0) + 1
        return {
            "total": len(rows),
            "limit": limit,
            "offset": offset,
            "items": rows[offset : offset + limit],
            "tools_per_conversation": [
                {"bucket": k, "count": dist.get(k, 0)} for k in [*map(str, range(10)), "10+"]
            ],
        }

    # -------------------------------------------------------------------- tools
    def tools(
        self,
        period: str = "24h",
        channel: str | None = None,
        tenant_id: str | None = None,
        from_ts: float | None = None,
        to_ts: float | None = None,
    ) -> dict[str, Any]:
        start, end = resolve_window(period, from_ts, to_ts)
        with self._lock:
            events = self._window(self._tools, start, end, channel, tenant_id)
        ranking = self._tool_ranking(events)
        total = len(events)
        errors = sum(r["errors"] for r in ranking)
        return {
            "period": period if from_ts is None else "custom",
            "total_calls": total,
            "errors": errors,
            "error_rate": _r(_ratio(errors, total)),
            "tools": ranking,
        }

    def tool_detail(
        self,
        tool: str,
        period: str = "24h",
        channel: str | None = None,
        tenant_id: str | None = None,
        from_ts: float | None = None,
        to_ts: float | None = None,
    ) -> dict[str, Any] | None:
        start, end = resolve_window(period, from_ts, to_ts)
        with self._lock:
            events = [
                e
                for e in self._window(self._tools, start, end, channel, tenant_id)
                if e.tool == tool
            ]
        if not events:
            return None
        stats = self._tool_ranking(events)[0]
        step = auto_step(end - start, target_points=40)
        b0 = math.floor(start / step) * step
        n = max(1, math.ceil((end - b0) / step))
        buckets: list[list[ToolEvent]] = [[] for _ in range(n)]
        for e in events:
            buckets[min(n - 1, int((e.ts - b0) // step))].append(e)
        series = [
            {
                "ts": b0 + i * step,
                "calls": len(evs),
                "errors": sum(1 for e in evs if not e.success),
                "p95": _r(percentile([e.duration for e in evs], 95)),
            }
            for i, evs in enumerate(buckets)
        ]
        recent = [
            {
                "ts": e.ts,
                "duration": round(e.duration, 4),
                "success": e.success,
                "error_type": e.error_type,
                "channel": e.channel,
                "tenant_id": e.tenant_id,
                "session_id": e.session_id,
            }
            for e in reversed(events[-25:])
        ]
        return {**stats, "series": series, "step_seconds": step, "recent": recent}

    # ------------------------------------------------------------------ tickets
    async def tickets(
        self,
        store: Any,
        limit: int = 50,
        status: str | None = None,
        channel: str | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        items = await store.list(status=status, tenant_id=tenant_id) if store else []
        now = time.time()
        rows = []
        for t in items:
            if channel and t.channel != channel:
                continue
            claimed_at = getattr(t, "claimed_at", None)
            resolved_at = getattr(t, "resolved_at", None)
            wait = (claimed_at or (now if t.status == "open" else None) or 0) - t.created_at
            resolution = None
            if resolved_at:
                resolution = resolved_at - (claimed_at or t.created_at)
            rows.append(
                {
                    "id": t.id,
                    "session_id": t.session_id,
                    "channel": t.channel,
                    "tenant_id": t.tenant_id,
                    "status": t.status,
                    "assignee": t.assignee,
                    "reason": getattr(t, "reason_code", None) or "other",
                    "reason_text": t.reason,
                    "created_at": t.created_at,
                    "claimed_at": claimed_at,
                    "resolved_at": resolved_at,
                    "wait_seconds": round(wait, 1) if wait and wait > 0 else None,
                    "resolution_seconds": round(resolution, 1) if resolution else None,
                    "messages": len(t.messages),
                }
            )
        counts = {"open": 0, "claimed": 0, "resolved": 0}
        for r in rows:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
        open_waits = [
            r["wait_seconds"] for r in rows if r["status"] == "open" and r["wait_seconds"]
        ]
        return {
            "total": len(rows),
            "by_status": counts,
            "oldest_open_wait_seconds": max(open_waits) if open_waits else None,
            "items": rows[:limit],
        }

    async def refresh_ticket_gauges(self, store: Any, max_age: float = 10.0) -> None:
        """Keep ``agent_tickets_active`` / ``agent_tickets_by_status`` in sync with the store."""
        if store is None or time.monotonic() - self._ticket_gauge_at < max_age:
            return
        self._ticket_gauge_at = time.monotonic()
        try:
            items = await store.list()
        except Exception:  # noqa: BLE001 - telemetry must never break /metrics
            return
        counts = {"open": 0, "claimed": 0, "resolved": 0}
        for t in items:
            counts[t.status] = counts.get(t.status, 0) + 1
        for status, n in counts.items():
            TICKETS_BY_STATUS.labels(status=status).set(n)
        ACTIVE_TICKETS.set(counts["open"] + counts["claimed"])

    # --------------------------------------------------------------- demo seed
    def seed_demo(self, hours: int = 24, turns_per_hour: int = 40, seed: int = 7) -> int:
        """Generate synthetic, clearly-fake traffic so the UI can be validated without an LLM.
        Only exposed in dev/test (see routers/analytics.py)."""
        rnd = random.Random(seed)
        now = time.time()
        channels = ["rest", "ws", "whatsapp", "slack", "gmail", "voice"]
        tenants = ["default", "acme_corp", "globex"]
        tool_names = ["web_search", "web_browse", "github_issue", "gmail_send", "slack_post"]
        reasons = ["human_requested", "cancel", "complex", "complex", "human_requested"]
        n = 0
        for h in range(hours, 0, -1):
            for _ in range(turns_per_hour + rnd.randint(-10, 10)):
                ts = now - h * 3600 + rnd.random() * 3600
                ch = rnd.choice(channels)
                ten = rnd.choice(tenants)
                sid = f"demo-{rnd.randint(1, 400)}"
                roll = rnd.random()
                handoff_bias = 0.18 if ch == "whatsapp" else 0.08
                outcome = (
                    "rate_limited"
                    if roll < 0.02
                    else "error"
                    if roll < 0.05
                    else "handoff"
                    if roll < 0.05 + handoff_bias
                    else "autonomous_resolved"
                )
                tools_used: list[str] = []
                if outcome == "autonomous_resolved" and rnd.random() < 0.55:
                    tools_used = rnd.choices(
                        tool_names, weights=[5, 3, 1, 1, 1], k=rnd.randint(1, 3)
                    )
                for t in tools_used:
                    ok = rnd.random() > (0.25 if t == "web_browse" else 0.04)
                    self.record_tool(
                        tool=t,
                        duration=rnd.lognormvariate(-0.5 if t != "web_browse" else 0.6, 0.6),
                        success=ok,
                        error_type=None if ok else rnd.choice(["timeout", "http_error"]),
                        channel=ch,
                        tenant_id=ten,
                        session_id=sid,
                        ts=ts,
                    )
                llm_calls = 0 if outcome in ("handoff", "rate_limited") else 1 + len(tools_used)
                for _ in range(llm_calls):
                    self.record_llm(
                        model="demo/llama-3.1-70b",
                        duration=rnd.lognormvariate(0.2, 0.4),
                        success=rnd.random() > 0.01,
                        prompt_tokens=rnd.randint(400, 3000),
                        completion_tokens=rnd.randint(40, 400),
                        channel=ch,
                        tenant_id=ten,
                        ts=ts,
                    )
                reason = rnd.choice(reasons) if outcome == "handoff" else None
                if reason:
                    self.record_handoff(
                        channel=ch, tenant_id=ten, reason=reason, session_id=sid, ts=ts
                    )
                    wait = rnd.lognormvariate(5, 1)
                    self.record_ticket(
                        kind="claimed",
                        ticket_id=sid,
                        channel=ch,
                        tenant_id=ten,
                        reason=reason,
                        seconds=wait,
                        ts=ts + wait,
                    )
                if outcome == "rate_limited":
                    self._health.append(HealthEvent(ts, "rate_limited", "ip", ch, ten))
                self.record_memory("redis", rnd.lognormvariate(-6, 0.5), rnd.random() > 0.3, ts=ts)
                if rnd.random() < 0.5:
                    self.record_memory(
                        "pgvector", rnd.lognormvariate(-3, 0.5), rnd.random() > 0.5, ts=ts
                    )
                for node, mu in (("classify_intent", -7), ("prepare", -6), ("save_turn", -5)):
                    self.record_node(node, rnd.lognormvariate(mu, 0.5), ts=ts)
                dur = (
                    0.0
                    if outcome == "rate_limited"
                    else (rnd.lognormvariate(0.4, 0.5) + sum(0.6 for _ in tools_used))
                )
                self.record_turn(
                    session_id=sid,
                    channel=ch,
                    tenant_id=ten,
                    outcome=outcome,
                    duration=dur,
                    tools=tools_used,
                    cycles=len(tools_used),
                    llm_calls=llm_calls,
                    handoff_reason=reason,
                    ts=ts,
                )
                n += 1
        # keep deques time-ordered (seed writes interleaved timestamps)
        with self._lock:
            for name in (
                "_turns",
                "_tools",
                "_llm",
                "_handoffs",
                "_tickets",
                "_health",
                "_samples",
            ):
                dq = getattr(self, name)
                ordered = sorted(dq, key=lambda e: e.ts)
                dq.clear()
                dq.extend(ordered)
            self._cache.clear()
        return n


ANALYTICS = AnalyticsStore()
