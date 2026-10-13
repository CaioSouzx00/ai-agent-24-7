"""Agent invocation runner decoupling graph execution from API routing."""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI

from app.metrics import REQUEST_LATENCY, REQUESTS


async def run_agent(
    app: FastAPI,
    session_id: str,
    message: str,
    channel: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute a single agent interaction turn and record request telemetry."""
    REQUESTS.labels(channel=channel).inc()
    t0 = time.monotonic()
    try:
        out = await app.state.graph.ainvoke(
            {
                "session_id": session_id,
                "user_input": message,
                "channel": channel,
                "meta": meta or {},
            }
        )
        return {
            "response": out.get("response", ""),
            "handoff": out.get("handoff", False),
            "paused": out.get("paused", False),
        }
    finally:
        REQUEST_LATENCY.labels(channel=channel).observe(time.monotonic() - t0)
