"""FastAPI: health checks, REST/WebSocket chat, voice, tools, and webhooks."""

from __future__ import annotations

import hmac
import json
import logging
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.agent.graph import build_graph
from app.channels import get_senders
from app.config import get_settings
from app.handoff_api import api as handoff_api
from app.handoff_api import public as handoff_public
from app.health import readiness
from app.i18n import detect_language, get_localized_message
from app.llm import get_llm
from app.memory import InMemorySessionStore, LongTermMemory, SessionStore
from app.routers import chat, dashboard, tools, voice
from app.runner import run_agent
from app.security import verify_meta_signature, verify_slack_signature
from app.tickets import InMemoryTicketStore, RedisTicketStore, notify_humans
from app.tools import integrations  # noqa: F401  (registers tools)
from app.tools.base import registry
from app.voice import VoicePipeline

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    if s.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(dsn=s.sentry_dsn)
    llm = get_llm()

    session_store = SessionStore(s.redis_url)
    if not await session_store.ping():
        log.warning("Redis unreachable; using in-memory sessions (not persistent)")
        session_store = InMemorySessionStore()

    memory = None
    try:
        memory = await LongTermMemory.connect(s.database_url, llm)
    except Exception as exc:  # noqa: BLE001
        log.warning("Postgres/pgvector unavailable; long-term memory disabled (%s)", exc)

    tickets = (
        RedisTicketStore(session_store._r)
        if isinstance(session_store, SessionStore)
        else InMemoryTicketStore()
    )

    async def notifier(ticket):
        await notify_humans(ticket, s.slack_handoff_webhook, s.public_url)

    app.state.llm = llm
    app.state.sessions = session_store
    app.state.memory = memory
    app.state.tickets = tickets
    app.state.voice = VoicePipeline()
    app.state.graph = build_graph(llm, registry, session_store, memory, tickets, notifier)
    yield


app = FastAPI(title="AI Agent 24/7", version="0.2.0", lifespan=lifespan)

# Mount modular routers
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(tools.router)
app.include_router(dashboard.router)
app.include_router(handoff_public)
app.include_router(handoff_api)


async def _run(
    session_id: str,
    message: str,
    channel: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute a single agent interaction turn."""
    return await run_agent(app, session_id, message, channel, meta)


def _senders():
    return get_senders(app.state)


async def _reply(
    channel: str,
    session_id: str,
    text: str,
    send: Callable[[str], Awaitable[None]],
    meta: dict[str, Any] | None = None,
) -> None:
    """Run the agent and deliver the answer to the originating channel (background task)."""
    try:
        result = await _run(session_id, text, channel, meta)
    except Exception:  # noqa: BLE001
        log.exception("agent failed for %s session %s", channel, session_id)
        lang = detect_language(text)
        result = {"response": get_localized_message("error", lang)}
    if result.get("paused"):
        return  # a human owns this conversation; the bot stays silent
    try:
        await send(result["response"] or "(no response)")
    except Exception:  # noqa: BLE001
        log.exception("failed to deliver %s reply for session %s", channel, session_id)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/live")
async def live():
    return {"status": "alive"}


@app.get("/ready")
async def ready():
    code, body = await readiness(
        app.state.llm, app.state.sessions, app.state.memory, app.state.tickets
    )
    return JSONResponse(body, status_code=code)


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/webhooks/slack")
async def slack_webhook(request: Request, background: BackgroundTasks):
    body = await request.body()
    secret = get_settings().slack_signing_secret
    if not secret:
        raise HTTPException(503, "SLACK_SIGNING_SECRET is not configured")
    if not verify_slack_signature(
        secret,
        request.headers.get("x-slack-request-timestamp"),
        request.headers.get("x-slack-signature"),
        body,
    ):
        raise HTTPException(401, "invalid Slack signature")
    if request.headers.get("x-slack-retry-num"):
        return {"ok": True}  # already handled; avoid duplicate replies on Slack retries
    payload = json.loads(body)
    if payload.get("type") == "url_verification":
        return {"challenge": payload["challenge"]}
    event = payload.get("event", {})
    if event.get("type") == "message" and not event.get("bot_id") and event.get("text"):
        channel = event.get("channel", "slack")
        background.add_task(
            _reply, "slack", channel, event["text"], lambda t: _senders().slack(channel, t)
        )
    return {"ok": True}


@app.get("/webhooks/whatsapp")
async def whatsapp_verify(
    mode: str = Query(alias="hub.mode"),
    token: str = Query(alias="hub.verify_token"),
    challenge: str = Query(alias="hub.challenge"),
):
    expected = get_settings().whatsapp_verify_token
    if expected and mode == "subscribe" and hmac.compare_digest(token, expected):
        return PlainTextResponse(challenge)
    raise HTTPException(403)


@app.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request, background: BackgroundTasks):
    body = await request.body()
    secret = get_settings().whatsapp_app_secret
    if not secret:
        raise HTTPException(503, "WHATSAPP_APP_SECRET is not configured")
    if not verify_meta_signature(secret, request.headers.get("x-hub-signature-256"), body):
        raise HTTPException(401, "invalid WhatsApp signature")
    data = json.loads(body)
    try:
        value = data["entry"][0]["changes"][0]["value"]
        msg = value["messages"][0]
        text = msg["text"]["body"]
        phone_id = value["metadata"]["phone_number_id"]
    except (KeyError, IndexError):
        return {"ok": True}  # statuses, media, etc.
    sender = msg["from"]
    background.add_task(
        _reply,
        "whatsapp",
        sender,
        text,
        lambda t: _senders().whatsapp(sender, t, phone_id),
        {"phone_number_id": phone_id},
    )
    return {"ok": True}
