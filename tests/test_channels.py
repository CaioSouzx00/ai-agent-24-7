"""Tests for outbound channel replies."""

import json

import httpx
import pytest

from app.channels import send_slack, send_whatsapp
from app.config import get_settings
from app.main import _reply, app


@pytest.fixture(autouse=True)
def _clear_settings():
    yield
    get_settings.cache_clear()


async def test_send_whatsapp_payload(monkeypatch):
    monkeypatch.setenv("WHATSAPP_TOKEN", "tok")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/PN1/messages")
        assert request.headers["authorization"] == "Bearer tok"
        assert json.loads(request.content) == {
            "messaging_product": "whatsapp",
            "to": "551199",
            "type": "text",
            "text": {"body": "hi"},
        }
        return httpx.Response(200, json={})

    await send_whatsapp("551199", "hi", "PN1", transport=httpx.MockTransport(handler))


async def test_send_whatsapp_requires_token(monkeypatch):
    monkeypatch.setenv("WHATSAPP_TOKEN", "")
    get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="WHATSAPP_TOKEN"):
        await send_whatsapp("1", "x", "PN1")


async def test_send_whatsapp_truncates_long_text(monkeypatch):
    monkeypatch.setenv("WHATSAPP_TOKEN", "tok")
    get_settings.cache_clear()
    seen = {}

    def handler(request):
        seen["len"] = len(json.loads(request.content)["text"]["body"])
        return httpx.Response(200, json={})

    await send_whatsapp("1", "x" * 10_000, "PN1", transport=httpx.MockTransport(handler))
    assert seen["len"] == 4096


async def test_send_slack_raises_on_api_error(monkeypatch):
    monkeypatch.setenv("SLACK_BOT_TOKEN", "xoxb")
    get_settings.cache_clear()
    transport = httpx.MockTransport(
        lambda r: httpx.Response(200, json={"ok": False, "error": "not_in_channel"})
    )
    with pytest.raises(RuntimeError, match="not_in_channel"):
        await send_slack("C1", "hi", transport=transport)


class BoomGraph:
    async def ainvoke(self, state):
        raise RuntimeError("llm down")


async def test_reply_sends_apology_when_agent_fails():
    app.state.graph = BoomGraph()
    sent = []

    async def send(text):
        sent.append(text)

    await _reply("slack", "C1", "hi", send)
    assert len(sent) == 1 and "went wrong" in sent[0]


async def test_reply_swallows_delivery_errors():
    class OkGraph:
        async def ainvoke(self, state):
            return {"response": "hello"}

    app.state.graph = OkGraph()

    async def send(text):
        raise RuntimeError("slack down")

    await _reply("slack", "C1", "hi", send)  # must not raise
