"""Agent invocation runner decoupling graph execution from API routing.

This is the single choke point for every channel (REST, WS, Slack, WhatsApp, Gmail, voice),
so it owns the turn-level telemetry: one ``agent_conversation_turns_total{outcome}`` sample
and one analytics ``TurnEvent`` per request.

Outcome semantics (bounded set, see ``app.metrics.TURN_OUTCOMES``):
  autonomous_resolved  the agent answered without escalating or failing. This is a *proxy*
                       for resolution (no CSAT signal exists), not proof the user was helped.
  handoff              this turn created a human ticket.
  human_active         a ticket was already open: the bot stayed silent (excluded from rates).
  error                the graph raised.
  rate_limited         recorded by the rate limiter before the graph runs.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI

from app.analytics import ANALYTICS
from app.metrics import REQUEST_LATENCY, REQUESTS


def classify_outcome(out: dict[str, Any] | None) -> str:
    if out is None:
        return "error"
    if out.get("paused"):
        return "human_active"
    if out.get("handoff"):
        return "handoff"
    return "autonomous_resolved"


async def run_agent(
    app: FastAPI,
    session_id: str,
    message: str,
    channel: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute a single agent interaction turn and record request telemetry."""
    meta = meta or {}
    tenant_id = meta.get("tenant_id") or "default"
    REQUESTS.labels(channel=channel).inc()
    t0 = time.monotonic()
    out: dict[str, Any] | None = None
    try:
        out = await app.state.graph.ainvoke(
            {
                "session_id": session_id,
                "user_input": message,
                "channel": channel,
                "meta": meta,
            }
        )
        return {
            "response": out.get("response", ""),
            "handoff": out.get("handoff", False),
            "paused": out.get("paused", False),
        }
    finally:
        duration = time.monotonic() - t0
        REQUEST_LATENCY.labels(channel=channel).observe(duration)
        try:
            state = out or {}
            usage = state.get("llm_usage") or {}
            rounds = int(state.get("rounds") or 0)
            ANALYTICS.record_turn(
                session_id=session_id,
                channel=channel,
                tenant_id=tenant_id,
                outcome=classify_outcome(out),
                duration=duration,
                tools=state.get("tools_used") or [],
                cycles=max(0, rounds - 1),  # think->tools->think loops
                llm_calls=int(usage.get("calls", 0)),
                prompt_tokens=int(usage.get("prompt", 0)),
                completion_tokens=int(usage.get("completion", 0)),
                handoff_reason=state.get("handoff_reason"),
            )
        except Exception:  # noqa: BLE001 - telemetry must never break a user turn
            pass
