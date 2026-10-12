"""Tests for human handoff: tickets, alerts, paused sessions and the /handoff API."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent.graph import build_graph
from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse
from app.main import app
from app.memory import InMemorySessionStore
from app.tickets import (
    InMemoryTicketStore,
    RedisTicketStore,
    Ticket,
    format_alert,
    notify_humans,
)
from app.tools.base import ToolRegistry


class CountingLLM(LLMProvider):
    def __init__(self):
        self.calls = 0

    async def chat(self, messages, tools=None, temperature=0.2):
        self.calls += 1
        return LLMResponse("bot answer")


async def run(graph, sid, text, channel="slack", meta=None):
    return await graph.ainvoke(
        {"session_id": sid, "user_input": text, "channel": channel, "meta": meta or {}}
    )


# ---- graph behaviour ----


async def test_sensitive_message_creates_ticket_and_alerts():
    tickets, alerts = InMemoryTicketStore(), []

    async def notifier(t):
        alerts.append(t)

    sessions = InMemorySessionStore()
    await sessions.append("C1", {"role": "user", "content": "earlier"})
    g = build_graph(CountingLLM(), ToolRegistry(), sessions, None, tickets, notifier)
    out = await run(g, "C1", "I want a refund", meta={"phone_number_id": "P"})
    assert out["handoff"] and "human agent" in out["response"]
    t = await tickets.active_for("C1")
    assert t and t.channel == "slack" and t.meta == {"phone_number_id": "P"}
    assert [m["content"] for m in t.messages] == ["earlier", "I want a refund"]  # full history
    assert alerts == [t]


async def test_bot_is_silent_while_ticket_is_active():
    tickets, llm = InMemoryTicketStore(), CountingLLM()
    sessions = InMemorySessionStore()
    g = build_graph(llm, ToolRegistry(), sessions, None, tickets)
    await run(g, "C1", "I need a lawyer")
    out = await run(g, "C1", "hello?? anyone there")
    assert out["paused"] is True and out["response"] == ""
    assert llm.calls == 0
    t = await tickets.active_for("C1")
    assert t.messages[-1] == {"role": "user", "content": "hello?? anyone there"} or (
        t.messages[-1]["content"] == "hello?? anyone there"
    )
    assert (await sessions.get("C1"))[-1]["content"] == "hello?? anyone there"


async def test_bot_resumes_after_resolve_and_other_sessions_unaffected():
    tickets, llm = InMemoryTicketStore(), CountingLLM()
    g = build_graph(llm, ToolRegistry(), InMemorySessionStore(), None, tickets)
    await run(g, "A", "this is fraud")
    assert (await run(g, "B", "hi"))["response"] == "bot answer"  # B unaffected
    t = await tickets.active_for("A")
    await tickets.resolve(t.id)
    assert (await run(g, "A", "thanks, another question"))["response"] == "bot answer"


async def test_notifier_is_optional():
    g = build_graph(CountingLLM(), ToolRegistry(), None, None, InMemoryTicketStore())
    assert (await run(g, "x", "talk to a human"))["handoff"]


# ---- tickets & alerts ----


async def test_claim_and_resolve_lifecycle():
    s = InMemoryTicketStore()
    t = await s.create("S", "slack", {}, [{"role": "user", "content": "x"}])
    assert (await s.claim(t.id, "ana")).assignee == "ana" and t.status == "claimed"
    assert await s.active_for("S")
    await s.resolve(t.id)
    assert await s.active_for("S") is None
    assert await s.claim(t.id, "bob") is None  # cannot claim a resolved ticket
    assert [x.id for x in await s.list("resolved")] == [t.id]


def test_alert_text_contains_key_info():
    t = Ticket(
        "abc12345", "S1", "whatsapp", reason="fraud", messages=[{"role": "user", "content": "help"}]
    )
    text = format_alert(t, "https://bot.example.com/")
    assert "abc12345" in text and "whatsapp" in text and "help" in text
    assert "https://bot.example.com/handoff/ui" in text


async def test_notify_humans_posts_and_never_raises():
    t = Ticket("t1", "S", "slack", messages=[{"role": "user", "content": "hi"}])
    seen = {}

    def ok(request):
        seen["body"] = json.loads(request.content)
        return httpx.Response(200)

    assert await notify_humans(t, "https://hooks.test/x", transport=httpx.MockTransport(ok))
    assert "t1" in seen["body"]["text"]
    boom = httpx.MockTransport(lambda r: httpx.Response(500))
    assert await notify_humans(t, "https://hooks.test/x", transport=boom) is False
    assert await notify_humans(t, "") is False


class FakeRedis:
    def __init__(self):
        self.kv, self.z = {}, {}

    async def set(self, k, v, ex=None):
        self.kv[k] = v.encode() if isinstance(v, str) else v

    async def get(self, k):
        return self.kv.get(k)

    async def delete(self, k):
        self.kv.pop(k, None)

    async def zadd(self, k, mapping):
        self.z.setdefault(k, {}).update(mapping)

    async def zrevrange(self, k, a, b):
        items = sorted(self.z.get(k, {}).items(), key=lambda kv: kv[1], reverse=True)
        return [i.encode() for i, _ in items]


async def test_redis_ticket_store_roundtrip():
    s = RedisTicketStore(FakeRedis())
    t = await s.create(
        "S", "whatsapp", {"phone_number_id": "P"}, [{"role": "user", "content": "x"}]
    )
    assert (await s.active_for("S")).id == t.id
    await s.add_message(t.id, "human", "hello")
    await s.claim(t.id, "ana")
    got = await s.get(t.id)
    assert (
        got.status == "claimed" and got.assignee == "ana" and got.messages[-1]["content"] == "hello"
    )
    assert [x.id for x in await s.list()] == [t.id]
    await s.resolve(t.id)
    assert await s.active_for("S") is None


# ---- API ----


class FakeSenders:
    def __init__(self):
        self.sent = []

    async def slack(self, channel, text):
        self.sent.append(("slack", channel, text))

    async def whatsapp(self, to, text, phone_id):
        self.sent.append(("whatsapp", to, text, phone_id))


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("API_KEYS", "")
    get_settings.cache_clear()
    app.state.tickets = InMemoryTicketStore()
    app.state.sessions = InMemorySessionStore()
    app.state.senders = FakeSenders()
    yield TestClient(app)
    get_settings.cache_clear()


async def _ticket(channel="slack", meta=None):
    return await app.state.tickets.create(
        "S1", channel, meta or {}, [{"role": "user", "content": "help"}]
    )


async def test_api_list_get_claim_reply_resolve(api):
    t = await _ticket()
    assert [x["id"] for x in api.get("/handoff/tickets?status=open").json()] == [t.id]
    assert api.get(f"/handoff/tickets/{t.id}").json()["messages"][0]["content"] == "help"
    assert (
        api.post(f"/handoff/tickets/{t.id}/claim", json={"assignee": "ana"}).json()["status"]
        == "claimed"
    )

    r = api.post(f"/handoff/tickets/{t.id}/reply", json={"text": "Hi, I'm Ana"})
    assert r.json() == {"delivered": True}
    assert app.state.senders.sent == [("slack", "S1", "Hi, I'm Ana")]
    assert (await app.state.sessions.get("S1"))[-1] == {
        "role": "assistant",
        "content": "Hi, I'm Ana",
    }

    assert api.post(f"/handoff/tickets/{t.id}/resolve").json()["status"] == "resolved"
    assert api.post(f"/handoff/tickets/{t.id}/reply", json={"text": "late"}).status_code == 409


async def test_api_reply_auto_claims_and_routes_whatsapp(api):
    t = await _ticket("whatsapp", {"phone_number_id": "PN9"})
    api.post(f"/handoff/tickets/{t.id}/reply", json={"text": "hello", "assignee": "bia"})
    assert (await app.state.tickets.get(t.id)).assignee == "bia"
    assert app.state.senders.sent == [("whatsapp", "S1", "hello", "PN9")]


async def test_api_reply_on_web_channel_is_not_delivered(api):
    t = await _ticket("rest")
    assert api.post(f"/handoff/tickets/{t.id}/reply", json={"text": "x"}).json() == {
        "delivered": False
    }


def test_api_404_and_ui(api):
    assert api.get("/handoff/tickets/nope").status_code == 404
    page = api.get("/handoff/ui")
    assert page.status_code == 200 and "Human Handoff Console" in page.text


def test_api_requires_key_in_prod(monkeypatch):
    monkeypatch.setenv("APP_ENV", "prod")
    monkeypatch.setenv("API_KEYS", "k1")
    get_settings.cache_clear()
    app.state.tickets = InMemoryTicketStore()
    c = TestClient(app)
    assert c.get("/handoff/tickets").status_code == 401
    assert c.get("/handoff/tickets", headers={"x-api-key": "k1"}).status_code == 200
    assert c.get("/handoff/ui").status_code == 200  # static page is public; data is not
    get_settings.cache_clear()
