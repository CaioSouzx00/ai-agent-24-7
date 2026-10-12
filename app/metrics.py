"""Central Prometheus metrics definitions with idempotent registration."""

from __future__ import annotations

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
    TOOL_CALLS = Counter(
        "agent_tool_calls_total", "Total tool executions", ["tool_name", "status"]
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
