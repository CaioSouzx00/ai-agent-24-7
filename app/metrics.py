"""Central Prometheus and business metrics definitions with idempotent registration.

Metric families are grouped by concern (A..F) to mirror the Agent Behavior dashboard:

A. conversation / turn      B. LangGraph + LLM          C. tool calling
D. human handoff            E. memory / context         F. health & degradation

Cardinality note: ``tenant_id`` is only attached to low-volume counters (turns, handoffs).
Never label metrics with session ids, user ids or free text.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Sequence
from typing import Any

from prometheus_client import REGISTRY, Counter, Gauge, Histogram

# Latency buckets sized for LLM agents (a full turn with tools easily exceeds 10s).
LATENCY_BUCKETS = (0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 20.0, 30.0, 60.0)
FAST_BUCKETS = (0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
QUEUE_BUCKETS = (5, 15, 30, 60, 120, 300, 600, 1800, 3600, 7200, 14400, 86400)
CONVERSATION_BUCKETS = (1, 5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600)
COUNT_BUCKETS = (0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20)
TOKEN_BUCKETS = (64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768)

# Handoff reason taxonomy (kept closed to bound cardinality).
HANDOFF_REASONS = ("human_requested", "frustration", "cancel", "complex", "low_confidence", "other")
TURN_OUTCOMES = ("autonomous_resolved", "handoff", "error", "rate_limited", "human_active")


def _metric(cls: type, name: str, doc: str, labels: Sequence[str] = (), **kwargs: Any) -> Any:
    """Return the already-registered collector or create it (safe under module reloads)."""
    existing = REGISTRY._names_to_collectors.get(name)
    if existing is not None:
        return existing
    return cls(name, doc, list(labels), **kwargs)


# ---------------------------------------------------------------------------
# Pre-existing metrics (names preserved for Grafana backwards compatibility)
# ---------------------------------------------------------------------------
REQUESTS = _metric(Counter, "agent_requests_total", "Total messages processed", ["channel"])
REQUEST_LATENCY = _metric(
    Histogram,
    "agent_request_duration_seconds",
    "Request duration in seconds",
    ["channel"],
    buckets=LATENCY_BUCKETS,
)
TOOL_CALLS = _metric(
    Counter,
    "agent_tool_calls_total",
    "Total tool executions",
    ["tool_name", "status", "channel"],
)
TOOL_LATENCY = _metric(
    Histogram,
    "agent_tool_duration_seconds",
    "Tool execution duration in seconds",
    ["tool_name"],
    buckets=LATENCY_BUCKETS,
)
RATELIMIT_EXCEEDED = _metric(
    Counter, "agent_ratelimit_exceeded_total", "Total rate limit rejections", ["identifier_type"]
)
ACTIVE_TICKETS = _metric(
    Gauge, "agent_tickets_active", "Number of currently active (open+claimed) handoff tickets"
)
DYNAMIC_TOOLS = _metric(Gauge, "agent_dynamic_tools_total", "Number of registered dynamic tools")
HANDOFFS_TOTAL = _metric(
    Counter,
    "agent_handoffs_total",
    "Total human handoff escalations",
    ["channel", "tenant_id", "reason"],
)

# ---------------------------------------------------------------------------
# A. Conversation / turn
# ---------------------------------------------------------------------------
CONVERSATION_TURNS = _metric(
    Counter,
    "agent_conversation_turns_total",
    "Agent turns by final outcome",
    ["channel", "tenant_id", "outcome"],
)
CONVERSATION_DURATION = _metric(
    Histogram,
    "agent_conversation_duration_seconds",
    "Conversation duration (first turn -> last turn or handoff); observed when it closes",
    ["channel"],
    buckets=CONVERSATION_BUCKETS,
)
ACTIVE_SESSIONS = _metric(
    Gauge, "agent_active_sessions", "Sessions with activity inside the idle window (30 min)"
)

# ---------------------------------------------------------------------------
# B. LangGraph + LLM
# ---------------------------------------------------------------------------
GRAPH_NODE_DURATION = _metric(
    Histogram,
    "agent_graph_node_duration_seconds",
    "Duration of each LangGraph node",
    ["node"],
    buckets=FAST_BUCKETS + (10.0, 30.0),
)
GRAPH_CYCLES = _metric(
    Counter,
    "agent_graph_cycles_total",
    "think -> execute_tools -> think loops executed",
    ["channel"],
)
GRAPH_CYCLES_PER_REQUEST = _metric(
    Histogram,
    "agent_graph_cycles_per_request",
    "Tool loops per request",
    ["channel"],
    buckets=COUNT_BUCKETS,
)
LLM_CALLS = _metric(Counter, "agent_llm_calls_total", "LLM chat completions", ["model", "status"])
LLM_TOKENS = _metric(
    Counter,
    "agent_llm_tokens_total",
    "Tokens reported by the provider `usage` block",
    ["model", "type"],
)
LLM_LATENCY = _metric(
    Histogram,
    "agent_llm_latency_seconds",
    "LLM chat completion latency",
    ["model"],
    buckets=LATENCY_BUCKETS,
)

# ---------------------------------------------------------------------------
# C. Tool calling
# ---------------------------------------------------------------------------
TOOLS_PER_CONVERSATION = _metric(
    Histogram,
    "agent_tools_per_conversation",
    "Tool calls per conversation; observed when the conversation closes",
    buckets=COUNT_BUCKETS,
)
TOOL_ERRORS = _metric(
    Counter,
    "agent_tool_error_total",
    "Tool failures by coarse error class",
    ["tool_name", "error_type"],
)

# ---------------------------------------------------------------------------
# D. Human handoff
# ---------------------------------------------------------------------------
HANDOFF_WAIT = _metric(
    Histogram,
    "agent_handoff_wait_seconds",
    "Ticket created -> claimed by a human",
    ["channel"],
    buckets=QUEUE_BUCKETS,
)
HANDOFF_RESOLUTION = _metric(
    Histogram,
    "agent_handoff_resolution_seconds",
    "Ticket claimed (or created, if never claimed) -> resolved",
    ["channel"],
    buckets=QUEUE_BUCKETS,
)
TICKETS_BY_STATUS = _metric(
    Gauge, "agent_tickets_by_status", "Tickets in the store by status", ["status"]
)

# ---------------------------------------------------------------------------
# E. Memory / context
# ---------------------------------------------------------------------------
MEMORY_RETRIEVAL = _metric(
    Histogram,
    "agent_memory_retrieval_seconds",
    "Memory read latency by tier",
    ["tier"],
    buckets=FAST_BUCKETS,
)
MEMORY_HITS = _metric(
    Counter, "agent_memory_hits_total", "Memory reads that returned data", ["tier"]
)
MEMORY_MISSES = _metric(
    Counter, "agent_memory_misses_total", "Memory reads that returned nothing", ["tier"]
)
CONTEXT_TOKENS = _metric(
    Histogram,
    "agent_context_tokens_approx",
    "Prompt size per LLM call (provider prompt_tokens, else chars/4)",
    ["channel"],
    buckets=TOKEN_BUCKETS,
)

# ---------------------------------------------------------------------------
# F. Health & degradation
# ---------------------------------------------------------------------------
FALLBACK_MODE = _metric(
    Counter,
    "agent_fallback_mode_total",
    "Times a component degraded to a fallback (in-memory / disabled)",
    ["component"],
)
COMPONENT_DEGRADED = _metric(
    Gauge,
    "agent_component_degraded",
    "1 while a component runs in fallback mode",
    ["component"],
)
SSRF_BLOCKED = _metric(Counter, "agent_ssrf_blocked_total", "Outbound URLs blocked by SSRF guard")
WEBHOOK_SIGNATURE_FAIL = _metric(
    Counter,
    "agent_webhook_signature_fail_total",
    "Inbound webhooks rejected for invalid signature/token",
    ["channel"],
)


# In-memory thread-safe business analytics tracker
class BusinessMetricsTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tool_counts: dict[str, int] = {}
        self._tool_durations: dict[str, list[float]] = {}
        # (ts, channel, tenant_id, reason)
        self._handoff_timestamps: list[tuple[float, str, str, str]] = []

    def record_tool(
        self, tool_name: str, duration: float, success: bool, channel: str = "unknown"
    ) -> None:
        TOOL_CALLS.labels(
            tool_name=tool_name, status="success" if success else "error", channel=channel
        ).inc()
        TOOL_LATENCY.labels(tool_name=tool_name).observe(duration)
        with self._lock:
            self._tool_counts[tool_name] = self._tool_counts.get(tool_name, 0) + 1
            durations = self._tool_durations.setdefault(tool_name, [])
            durations.append(duration)
            if len(durations) > 100:
                del durations[:-100]

    def record_handoff(
        self, channel: str, tenant_id: str = "default", reason: str = "other"
    ) -> None:
        reason = reason if reason in HANDOFF_REASONS else "other"
        HANDOFFS_TOTAL.labels(channel=channel, tenant_id=tenant_id, reason=reason).inc()
        with self._lock:
            self._handoff_timestamps.append((time.time(), channel, tenant_id, reason))
            # bound memory: keep ~30 days worth at most 50k entries
            if len(self._handoff_timestamps) > 50_000:
                del self._handoff_timestamps[:-50_000]

    def get_summary(self) -> dict[str, Any]:
        with self._lock:
            now = time.time()
            one_day_ago = now - 86400
            recent_handoffs = [h for h in self._handoff_timestamps if h[0] >= one_day_ago]
            handoffs_by_channel: dict[str, int] = {}
            handoffs_by_tenant: dict[str, int] = {}
            handoffs_by_reason: dict[str, int] = {}
            for _, ch, t_id, reason in recent_handoffs:
                handoffs_by_channel[ch] = handoffs_by_channel.get(ch, 0) + 1
                handoffs_by_tenant[t_id] = handoffs_by_tenant.get(t_id, 0) + 1
                handoffs_by_reason[reason] = handoffs_by_reason.get(reason, 0) + 1

            # Most used tools ordered
            sorted_tools = sorted(
                [{"tool": t, "calls": c} for t, c in self._tool_counts.items()],
                key=lambda x: x["calls"],
                reverse=True,
            )

            # Latency per tool
            latency_per_tool: dict[str, dict[str, float]] = {}
            for tool_name, durs in self._tool_durations.items():
                if durs:
                    sorted_d = sorted(durs)
                    avg_d = sum(durs) / len(durs)
                    p95_idx = int(len(sorted_d) * 0.95)
                    p95_d = sorted_d[min(p95_idx, len(sorted_d) - 1)]
                    latency_per_tool[tool_name] = {
                        "avg_seconds": round(avg_d, 4),
                        "p95_seconds": round(p95_d, 4),
                        "total_samples": len(durs),
                    }

            return {
                "handoffs": {
                    "total_all_time": len(self._handoff_timestamps),
                    "last_24h": len(recent_handoffs),
                    "by_channel": handoffs_by_channel,
                    "by_tenant": handoffs_by_tenant,
                    "by_reason": handoffs_by_reason,
                },
                "tools": {
                    "ranking": sorted_tools,
                    "latency": latency_per_tool,
                },
            }


BUSINESS_TRACKER = BusinessMetricsTracker()
