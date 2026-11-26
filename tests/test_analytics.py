"""Agent Behavior analytics: instrumentation points + /api/analytics endpoints."""

import time

import httpx
import pytest
from prometheus_client import REGISTRY

from app.agent.graph import build_graph
from app.agent.handoff import handoff_reason
from app.analytics import ANALYTICS, AnalyticsStore, classify_tool_error, percentile
from app.analytics_demo import seed_demo
from app.llm.base import LLMProvider, LLMResponse, ToolCall
from app.main import app
from app.memory import InMemorySessionStore
from app.runner import run_agent
from app.tickets import InMemoryTicketStore
from app.tools.base import BaseTool, ToolRegistry


def _val(name: str, labels: dict) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


class ScriptedLLM(LLMProvider):
    model = "test/model"

    def __init__(self, responses):
        self.responses = list(responses)

    async def chat(self, messages, tools=None, temperature=0.2):
        return self.responses.pop(0) if self.responses else LLMResponse("final")


class BoomLLM(LLMProvider):
    async def chat(self, messages, tools=None, temperature=0.2):
        raise RuntimeError("provider down")


class EchoTool(BaseTool):
    name = "echo_analytics"
    description = "echo"
    parameters = {"type": "object", "properties": {}}

    async def run(self, **kwargs):
        return "ok"


class FakeApp:
    class state:  # noqa: N801
        graph = None


@pytest.fixture(autouse=True)
def _reset():
    ANALYTICS.reset()
    yield
    ANALYTICS.reset()


def test_handoff_reason_taxonomy():
    assert handoff_reason("I want to talk to a human") == "human_requested"
    assert handoff_reason("quero reembolso") == "cancel"
    assert handoff_reason("this is fraud") == "complex"
    assert handoff_reason("hello") == "other"


def test_percentile_and_error_classes():
    assert percentile([], 95) is None
    assert percentile([1, 2, 3, 4], 50) == 2
    assert classify_tool_error(None, "error: unknown tool x") == "unknown_tool"
    assert classify_tool_error(TimeoutError()) == "timeout"


async def test_autonomous_turn_with_tool_records_everything():
    reg = ToolRegistry()
    reg.register(EchoTool())
    llm = ScriptedLLM(
        [
            LLMResponse("", [ToolCall("echo_analytics", {}, "c1")], {"prompt_tokens": 100}),
            LLMResponse("done", usage={"prompt_tokens": 120, "completion_tokens": 7}),
        ]
    )
    FakeApp.state.graph = build_graph(llm, reg, InMemorySessionStore())
    before = _val(
        "agent_conversation_turns_total",
        {"channel": "rest", "tenant_id": "t1", "outcome": "autonomous_resolved"},
    )
    out = await run_agent(FakeApp, "s1", "hi", "rest", {"tenant_id": "t1"})
    assert out["response"] == "done"

    assert (
        _val(
            "agent_conversation_turns_total",
            {"channel": "rest", "tenant_id": "t1", "outcome": "autonomous_resolved"},
        )
        == before + 1
    )
    assert _val("agent_llm_tokens_total", {"model": "test/model", "type": "prompt"}) >= 220
    assert _val("agent_graph_node_duration_seconds_count", {"node": "think"}) >= 2

    s = ANALYTICS.summary("1h")
    assert s["volume"] == 1 and s["autonomous_rate"] == 1.0
    assert s["llm_calls"] == 2 and s["tokens"]["completion"] == 7
    assert s["tools"]["top"][0]["tool"] == "echo_analytics"
    assert "fallback" in s["health"]["memory"]  # in-memory session store = fallback tier

    conv = ANALYTICS.conversations()
    assert conv["items"][0]["tools_used"] == ["echo_analytics"]
    assert conv["items"][0]["outcome"] == "autonomous_resolved"


async def test_handoff_turn_records_reason_and_ticket_lifecycle():
    tickets = InMemoryTicketStore()
    FakeApp.state.graph = build_graph(ScriptedLLM([]), ToolRegistry(), None, None, tickets)
    await run_agent(FakeApp, "s2", "I want a refund", "whatsapp", {"tenant_id": "acme"})
    t = await tickets.active_for("s2")
    assert t.reason_code == "cancel"
    await tickets.claim(t.id, "sarah")
    await tickets.resolve(t.id)
    assert t.claimed_at and t.resolved_at

    s = ANALYTICS.summary("1h")
    assert s["handoff_rate"] == 1.0
    assert s["handoffs"]["by_reason"]["cancel"] == 1
    assert s["handoffs"]["claimed"] == 1 and s["handoffs"]["resolved"] == 1
    assert _val("agent_handoff_wait_seconds_count", {"channel": "whatsapp"}) >= 1

    # follow-up while ticket open would be human_active (excluded from rates)
    rows = (await ANALYTICS.tickets(tickets))["items"]
    assert rows[0]["reason"] == "cancel" and rows[0]["status"] == "resolved"


async def test_graph_error_is_counted():
    FakeApp.state.graph = build_graph(BoomLLM(), ToolRegistry())
    with pytest.raises(RuntimeError):
        await run_agent(FakeApp, "s3", "hi", "slack")
    s = ANALYTICS.summary("1h")
    assert s["outcomes"]["error"] == 1 and s["llm"]["errors"] == 1


def test_timeseries_grouping_and_validation():
    store = AnalyticsStore()
    store.seed_demo(hours=3, turns_per_hour=20)
    seed_demo(store, hours=3, turns_per_hour=20)
    ts = store.timeseries("requests", "6h", "1h", group_by="channel")
    assert ts["points"] and all("labels" in p for p in ts["points"])
    with pytest.raises(ValueError):
        store.timeseries("nope")
    with pytest.raises(ValueError):
        store.timeseries("requests", group_by="tool")


def test_demo_seed_never_touches_prometheus():
    labels = {"model": "demo/llama-3.1-70b", "status": "success"}
    before = _val("agent_llm_calls_total", labels)
    store = AnalyticsStore()
    assert seed_demo(store, hours=2, turns_per_hour=10) > 0
    assert _val("agent_llm_calls_total", labels) == before  # muted
    assert store.summary("6h")["llm_calls"] > 0  # but the analytics window is populated
    assert store._emit is True  # mute is scoped


def test_rate_limit_kpi_compares_same_scope():
    store = AnalyticsStore()
    now = time.time()
    with store.prometheus_muted():
        store.record_rate_limited("ip", ts=now - 1800)  # non-chat endpoint, current hour
        store.record_rate_limited("ip", channel="rest", ts=now - 5400)  # chat, previous hour
    s = store.summary("1h")
    assert s["health"]["rate_limited_total"] == 1
    assert s["previous"]["rate_limited_total"] == 1


async def test_ticket_wait_for_open_and_unclaimed_resolved():
    tickets = InMemoryTicketStore()
    t_open = await tickets.create("a", "rest", {}, [])
    t_open.created_at -= 120
    t_res = await tickets.create("b", "rest", {}, [])
    await tickets.resolve(t_res.id)  # resolved without ever being claimed
    rows = {r["id"]: r for r in (await ANALYTICS.tickets(tickets))["items"]}
    assert rows[t_open.id]["wait_seconds"] >= 120
    assert rows[t_res.id]["wait_seconds"] is None
    assert rows[t_res.id]["resolution_seconds"] is not None


async def test_analytics_endpoints():
    ANALYTICS.seed_demo(hours=2, turns_per_hour=15)
    seed_demo(ANALYTICS, hours=2, turns_per_hour=15)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        r = await c.get("/api/analytics/summary", params={"period": "24h"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["volume"] > 0 and "sparklines" in body
        r = await c.get(
            "/api/analytics/timeseries", params={"metric": "latency_p95", "period": "6h"}
        )
        assert r.status_code == 200 and r.json()["points"]
        assert (await c.get("/api/analytics/timeseries", params={"metric": "x"})).status_code == 422
        r = await c.get("/api/analytics/conversations", params={"limit": 5})
        assert r.status_code == 200 and len(r.json()["items"]) <= 5
        tools = (await c.get("/api/analytics/tools")).json()["tools"]
        assert tools
        r = await c.get(f"/api/analytics/tools/{tools[0]['tool']}")
        assert r.status_code == 200 and r.json()["recent"]
        assert (await c.get("/api/analytics/tools/does_not_exist")).status_code == 404
        assert (await c.get("/analytics")).status_code == 200
