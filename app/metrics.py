"""Central Prometheus and business metrics definitions with idempotent registration."""

from __future__ import annotations

import threading
import time
from typing import Any

from prometheus_client import REGISTRY, Counter, Gauge, Histogram

# Requests counter
if "agent_requests_total" in REGISTRY._names_to_collectors:
    REQUESTS = REGISTRY._names_to_collectors["agent_requests_total"]
else:
    REQUESTS = Counter("agent_requests_total", "Total messages processed", ["channel"])

# Request latency histogram
if "agent_request_duration_seconds" in REGISTRY._names_to_collectors:
    REQUEST_LATENCY = REGISTRY._names_to_collectors["agent_request_duration_seconds"]
else:
    REQUEST_LATENCY = Histogram(
        "agent_request_duration_seconds",
        "Request duration in seconds",
        ["channel"],
        buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    )

# Tool calls counter
if "agent_tool_calls_total" in REGISTRY._names_to_collectors:
    TOOL_CALLS = REGISTRY._names_to_collectors["agent_tool_calls_total"]
else:
    TOOL_CALLS = Counter("agent_tool_calls_total", "Total tool executions", ["tool_name", "status"])

# Tool duration histogram (latency per tool)
if "agent_tool_duration_seconds" in REGISTRY._names_to_collectors:
    TOOL_LATENCY = REGISTRY._names_to_collectors["agent_tool_duration_seconds"]
else:
    TOOL_LATENCY = Histogram(
        "agent_tool_duration_seconds",
        "Tool execution duration in seconds",
        ["tool_name"],
        buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    )

# Rate limit exceeded counter
if "agent_ratelimit_exceeded_total" in REGISTRY._names_to_collectors:
    RATELIMIT_EXCEEDED = REGISTRY._names_to_collectors["agent_ratelimit_exceeded_total"]
else:
    RATELIMIT_EXCEEDED = Counter(
        "agent_ratelimit_exceeded_total", "Total rate limit rejections", ["identifier_type"]
    )

# Active tickets gauge
if "agent_tickets_active" in REGISTRY._names_to_collectors:
    ACTIVE_TICKETS = REGISTRY._names_to_collectors["agent_tickets_active"]
else:
    ACTIVE_TICKETS = Gauge("agent_tickets_active", "Number of currently active handoff tickets")

# Dynamic tools count gauge
if "agent_dynamic_tools_total" in REGISTRY._names_to_collectors:
    DYNAMIC_TOOLS = REGISTRY._names_to_collectors["agent_dynamic_tools_total"]
else:
    DYNAMIC_TOOLS = Gauge("agent_dynamic_tools_total", "Number of registered dynamic tools")

# Handoffs counter
if "agent_handoffs_total" in REGISTRY._names_to_collectors:
    HANDOFFS_TOTAL = REGISTRY._names_to_collectors["agent_handoffs_total"]
else:
    HANDOFFS_TOTAL = Counter(
        "agent_handoffs_total",
        "Total human handoff escalations",
        ["channel", "tenant_id"],
    )


# In-memory thread-safe business analytics tracker
class BusinessMetricsTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tool_counts: dict[str, int] = {}
        self._tool_durations: dict[str, list[float]] = {}
        self._handoff_timestamps: list[tuple[float, str, str]] = []  # (ts, channel, tenant_id)

    def record_tool(self, tool_name: str, duration: float, success: bool) -> None:
        TOOL_CALLS.labels(tool_name=tool_name, status="success" if success else "error").inc()
        TOOL_LATENCY.labels(tool_name=tool_name).observe(duration)
        with self._lock:
            self._tool_counts[tool_name] = self._tool_counts.get(tool_name, 0) + 1
            durations = self._tool_durations.setdefault(tool_name, [])
            durations.append(duration)
            if len(durations) > 100:
                del durations[:-100]

    def record_handoff(self, channel: str, tenant_id: str = "default") -> None:
        HANDOFFS_TOTAL.labels(channel=channel, tenant_id=tenant_id).inc()
        with self._lock:
            self._handoff_timestamps.append((time.time(), channel, tenant_id))

    def get_summary(self) -> dict[str, Any]:
        with self._lock:
            now = time.time()
            one_day_ago = now - 86400
            recent_handoffs = [h for h in self._handoff_timestamps if h[0] >= one_day_ago]
            handoffs_by_channel: dict[str, int] = {}
            handoffs_by_tenant: dict[str, int] = {}
            for _, ch, t_id in recent_handoffs:
                handoffs_by_channel[ch] = handoffs_by_channel.get(ch, 0) + 1
                handoffs_by_tenant[t_id] = handoffs_by_tenant.get(t_id, 0) + 1

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
                },
                "tools": {
                    "ranking": sorted_tools,
                    "latency": latency_per_tool,
                },
            }


BUSINESS_TRACKER = BusinessMetricsTracker()
