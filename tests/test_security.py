"""Tests for channel security: webhook signatures and API-key auth."""

import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.security import verify_meta_signature, verify_slack_signature


class FakeGraph:
    def __init__(self):
        self.inputs = []

    async def ainvoke(self, state):
        self.inputs.append(state)
        return {"response": f"echo:{state['user_input']}", "handoff": False}


@pytest.fixture
def env(monkeypatch):
    def apply(**values):
        for k, v in values.items():
            monkeypatch.setenv(k, v)
        get_settings.cache_clear()

    yield apply
    get_settings.cache_clear()


@pytest.fixture
def client():
    app.state.graph = FakeGraph()
    return TestClient(app)  # no lifespan: avoids connecting to Redis/Postgres


def slack_headers(secret, body: bytes, ts=None):
    ts = str(ts or int(time.time()))
    sig = (
        "v0="
        + hmac.new(secret.encode(), b"v0:" + ts.encode() + b":" + body, hashlib.sha256).hexdigest()
    )
    return {"x-slack-request-timestamp": ts, "x-slack-signature": sig}


def meta_headers(secret, body: bytes):
    return {
        "x-hub-signature-256": "sha256="
        + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    }


# ---- pure functions ----


def test_slack_signature_rules():
    body = b'{"a":1}'
    h = slack_headers("s", body, ts=1000)
    ts, sig = h["x-slack-request-timestamp"], h["x-slack-signature"]
    assert verify_slack_signature("s", ts, sig, body, now=1000)
    assert not verify_slack_signature("s", ts, sig, b"tampered", now=1000)
    assert not verify_slack_signature("other", ts, sig, body, now=1000)
    assert not verify_slack_signature("s", ts, sig, body, now=1000 + 301)  # replay
    assert not verify_slack_signature("", ts, sig, body, now=1000)
    assert not verify_slack_signature("s", None, sig, body, now=1000)
    assert not verify_slack_signature("s", "abc", sig, body, now=1000)


def test_meta_signature_rules():
    body = b"{}"
    sig = meta_headers("k", body)["x-hub-signature-256"]
    assert verify_meta_signature("k", sig, body)
    assert not verify_meta_signature("k", sig, b"x")
    assert not verify_meta_signature("", sig, body)
    assert not verify_meta_signature("k", None, body)


# ---- Slack endpoint ----


def test_slack_rejects_when_secret_missing(client, env):
    env(SLACK_SIGNING_SECRET="")
    assert client.post("/webhooks/slack", content=b"{}").status_code == 503


def test_slack_rejects_bad_signature(client, env):
    env(SLACK_SIGNING_SECRET="s3cret")
    r = client.post("/webhooks/slack", content=b"{}", headers=slack_headers("wrong", b"{}"))
    assert r.status_code == 401


def test_slack_url_verification_and_message(client, env):
    env(SLACK_SIGNING_SECRET="s3cret")
    body = json.dumps({"type": "url_verification", "challenge": "abc"}).encode()
    r = client.post("/webhooks/slack", content=body, headers=slack_headers("s3cret", body))
    assert r.json() == {"challenge": "abc"}

    body = json.dumps({"event": {"type": "message", "channel": "C1", "text": "hi"}}).encode()
    r = client.post("/webhooks/slack", content=body, headers=slack_headers("s3cret", body))
    assert r.json()["response"] == "echo:hi"


def test_slack_retries_are_ignored(client, env):
    env(SLACK_SIGNING_SECRET="s3cret")
    body = json.dumps({"event": {"type": "message", "channel": "C1", "text": "hi"}}).encode()
    headers = {**slack_headers("s3cret", body), "x-slack-retry-num": "1"}
    before = len(app.state.graph.inputs)
    assert client.post("/webhooks/slack", content=body, headers=headers).json() == {"ok": True}
    assert len(app.state.graph.inputs) == before


# ---- WhatsApp endpoint ----


def wa_body(text="hello"):
    msg = {"from": "551199", "text": {"body": text}}
    return json.dumps({"entry": [{"changes": [{"value": {"messages": [msg]}}]}]}).encode()


def test_whatsapp_signature_required(client, env):
    env(WHATSAPP_APP_SECRET="k")
    body = wa_body()
    assert client.post("/webhooks/whatsapp", content=body).status_code == 401
    ok = client.post("/webhooks/whatsapp", content=body, headers=meta_headers("k", body))
    assert ok.json()["response"] == "echo:hello"


def test_whatsapp_rejects_when_secret_missing(client, env):
    env(WHATSAPP_APP_SECRET="")
    assert client.post("/webhooks/whatsapp", content=wa_body()).status_code == 503


def test_whatsapp_verify_handshake(client, env):
    env(WHATSAPP_VERIFY_TOKEN="vt")
    params = {"hub.mode": "subscribe", "hub.verify_token": "vt", "hub.challenge": "42"}
    assert client.get("/webhooks/whatsapp", params=params).text == "42"
    assert (
        client.get("/webhooks/whatsapp", params={**params, "hub.verify_token": "x"}).status_code
        == 403
    )


def test_whatsapp_verify_rejects_empty_token_when_unconfigured(client, env):
    env(WHATSAPP_VERIFY_TOKEN="")
    params = {"hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "42"}
    assert client.get("/webhooks/whatsapp", params=params).status_code == 403


# ---- /chat and /ws API key ----


def test_chat_open_in_dev_without_keys(client, env):
    env(APP_ENV="dev", API_KEYS="")
    assert client.post("/chat", json={"session_id": "s", "message": "hi"}).status_code == 200


def test_chat_closed_in_prod_without_keys(client, env):
    env(APP_ENV="prod", API_KEYS="")
    assert client.post("/chat", json={"session_id": "s", "message": "hi"}).status_code == 401


def test_chat_with_keys(client, env):
    env(APP_ENV="prod", API_KEYS="k1, k2")
    body = {"session_id": "s", "message": "hi"}
    assert client.post("/chat", json=body).status_code == 401
    assert client.post("/chat", json=body, headers={"x-api-key": "bad"}).status_code == 401
    assert client.post("/chat", json=body, headers={"x-api-key": "k2"}).status_code == 200
    assert (
        client.post("/chat", json=body, headers={"authorization": "Bearer k1"}).status_code == 200
    )


def test_websocket_auth(client, env):
    env(APP_ENV="prod", API_KEYS="k1")
    with pytest.raises(Exception):  # noqa: B017 - server closes with 1008 before accept
        with client.websocket_connect("/ws/s"):
            pass
    with client.websocket_connect("/ws/s?api_key=k1") as ws:
        ws.send_text("hello")
        assert ws.receive_json()["response"] == "echo:hello"
