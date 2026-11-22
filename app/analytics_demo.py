"""Synthetic traffic generator for the Agent Behavior dashboard (dev/test only).

Lets you validate every panel of ``/analytics`` without an LLM, Redis or real users.
Data goes through the public ``AnalyticsStore.record_*`` API inside
``prometheus_muted()``, so it fills the analytics window but NEVER touches the Prometheus
counters scraped by Grafana. Exposed via ``POST /api/analytics/_seed`` only when
``APP_ENV`` is ``dev`` or ``test``.
"""

from __future__ import annotations

import random
import time

from app.analytics import AnalyticsStore

CHANNELS = ("rest", "ws", "whatsapp", "slack", "gmail", "voice")
TENANTS = ("default", "acme_corp", "globex")
TOOLS = ("web_search", "web_browse", "github_issue", "gmail_send", "slack_post")
TOOL_WEIGHTS = (5, 3, 1, 1, 1)
REASONS = ("human_requested", "cancel", "complex", "complex", "human_requested")
DEMO_MODEL = "demo/llama-3.1-70b"


def _pick_outcome(rnd: random.Random, channel: str) -> str:
    # WhatsApp escalates more often, so the "handoff by channel" panels show a real signal.
    handoff_bias = 0.18 if channel == "whatsapp" else 0.08
    roll = rnd.random()
    if roll < 0.02:
        return "rate_limited"
    if roll < 0.05:
        return "error"
    if roll < 0.05 + handoff_bias:
        return "handoff"
    return "autonomous_resolved"


def _seed_turn(store: AnalyticsStore, rnd: random.Random, ts: float) -> None:
    ch, ten = rnd.choice(CHANNELS), rnd.choice(TENANTS)
    sid = f"demo-{rnd.randint(1, 400)}"
    outcome = _pick_outcome(rnd, ch)

    if outcome == "rate_limited":
        store.record_rate_limited("ip", channel=ch, tenant_id=ten, session_id=sid, ts=ts)
        return

    tools_used: list[str] = []
    if outcome == "autonomous_resolved" and rnd.random() < 0.55:
        tools_used = rnd.choices(TOOLS, weights=TOOL_WEIGHTS, k=rnd.randint(1, 3))
    for tool in tools_used:
        flaky = tool == "web_browse"  # one deliberately slow & flaky tool for the drill-down
        ok = rnd.random() > (0.25 if flaky else 0.04)
        store.record_tool(
            tool=tool,
            duration=rnd.lognormvariate(0.6 if flaky else -0.5, 0.6),
            success=ok,
            error_type=None if ok else rnd.choice(["timeout", "http_error"]),
            channel=ch,
            tenant_id=ten,
            session_id=sid,
            ts=ts,
        )

    llm_calls = 0 if outcome == "handoff" else 1 + len(tools_used)
    for _ in range(llm_calls):
        store.record_llm(
            model=DEMO_MODEL,
            duration=rnd.lognormvariate(0.2, 0.4),
            success=rnd.random() > 0.01,
            prompt_tokens=rnd.randint(400, 3000),
            completion_tokens=rnd.randint(40, 400),
            channel=ch,
            tenant_id=ten,
            ts=ts,
        )

    reason = rnd.choice(REASONS) if outcome == "handoff" else None
    if reason:
        store.record_handoff(channel=ch, tenant_id=ten, reason=reason, session_id=sid, ts=ts)
        wait = rnd.lognormvariate(5, 1)
        store.record_ticket(
            kind="claimed",
            ticket_id=sid,
            channel=ch,
            tenant_id=ten,
            reason=reason,
            seconds=wait,
            ts=ts + wait,
        )

    store.record_memory("redis", rnd.lognormvariate(-6, 0.5), rnd.random() > 0.3, ts=ts)
    if rnd.random() < 0.5:
        store.record_memory("pgvector", rnd.lognormvariate(-3, 0.5), rnd.random() > 0.5, ts=ts)
    for node, mu in (("classify_intent", -7), ("prepare", -6), ("save_turn", -5)):
        store.record_node(node, rnd.lognormvariate(mu, 0.5), ts=ts)

    store.record_turn(
        session_id=sid,
        channel=ch,
        tenant_id=ten,
        outcome=outcome,
        duration=rnd.lognormvariate(0.4, 0.5) + 0.6 * len(tools_used),
        tools=tools_used,
        cycles=len(tools_used),
        llm_calls=llm_calls,
        handoff_reason=reason,
        ts=ts,
    )


def seed_demo(
    store: AnalyticsStore, hours: int = 24, turns_per_hour: int = 40, seed: int = 7
) -> int:
    """Back-fill ``hours`` of realistic traffic. Returns the number of turns generated."""
    rnd = random.Random(seed)
    now = time.time()
    generated = 0
    with store.prometheus_muted():
        for h in range(hours, 0, -1):
            for _ in range(max(1, turns_per_hour + rnd.randint(-10, 10))):
                _seed_turn(store, rnd, now - h * 3600 + rnd.random() * 3600)
                generated += 1
    return generated
