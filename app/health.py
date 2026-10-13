"""Readiness checks (Task 5.3).

- LLM is REQUIRED: if it is unreachable the agent cannot answer, so /ready returns 503.
- Redis and Postgres are OPTIONAL: the app falls back (in-memory sessions / no long-term
  memory), so they only mark the service as "degraded" (still HTTP 200).
"""

from __future__ import annotations

import asyncio
from typing import Any

CHECK_TIMEOUT = 3.0


async def _check(fn) -> str:
    try:
        return "ok" if await asyncio.wait_for(fn(), CHECK_TIMEOUT) else "down"
    except Exception:  # noqa: BLE001
        return "down"


async def readiness(
    llm,
    sessions,
    memory,
    tickets=None,
    settings: Any = None,
) -> tuple[int, dict[str, Any]]:
    components: dict[str, str] = {}

    # Strict production check: fail readiness if critical secrets use insecure defaults
    cfg = settings
    if cfg is None:
        try:
            from app.config import get_settings

            cfg = get_settings()
        except Exception:
            cfg = None

    if cfg is not None and getattr(cfg, "app_env", "") in ("prod", "production"):
        from app.secrets import validate_production_settings

        issues = validate_production_settings(cfg)
        critical_issues = [i for i in issues if "CRITICAL" in i]
        if critical_issues:
            components["security"] = "failed (insecure production secrets)"
            return 503, {
                "status": "not_ready",
                "error": "insecure_production_configuration",
                "issues": critical_issues,
                "components": components,
            }

    tasks: dict[str, Any] = {"llm": _check(llm.health)}
    if hasattr(sessions, "ping"):
        tasks["redis"] = _check(sessions.ping)
    else:
        components["redis"] = "fallback (in-memory sessions)"
    if memory is not None:
        tasks["postgres"] = _check(memory.ping)
    else:
        components["postgres"] = "disabled (no long-term memory)"

    results = await asyncio.gather(*tasks.values())
    components.update(dict(zip(tasks.keys(), results, strict=True)))

    if tickets is not None:
        components["tickets"] = getattr(tickets, "backend_name", "in-memory")

    if components["llm"] != "ok":
        return 503, {"status": "not_ready", "components": components}
    degraded = any(
        v == "down" or v.startswith(("fallback", "disabled"))
        for k, v in components.items()
        if k != "tickets"
    )
    return 200, {"status": "degraded" if degraded else "ready", "components": components}
