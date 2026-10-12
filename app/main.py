"""FastAPI: health checks, REST/WebSocket chat and webhooks (Phases 2, 4, 5)."""

from __future__ import annotations

import hmac
import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from pydantic import BaseModel

from app.agent.graph import build_graph
from app.config import get_settings
from app.health import readiness
from app.llm import get_llm
from app.memory import InMemorySessionStore, LongTermMemory, SessionStore
from app.security import (
    require_api_key,
    verify_meta_signature,
    verify_slack_signature,
    websocket_authorized,
)
from app.tools import integrations  # noqa: F401  (registers tools)
from app.tools.base import registry

log = logging.getLogger(__name__)

REQUESTS = Counter("agent_requests_total", "Total messages processed", ["channel"])


class ChatIn(BaseModel):
    session_id: str
    message: str


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

    app.state.llm = llm
    app.state.sessions = session_store
    app.state.memory = memory
    app.state.graph = build_graph(llm, registry, session_store, memory)
    yield


app = FastAPI(title="AI Agent 24/7", version="0.1.0", lifespan=lifespan)


async def _run(session_id: str, message: str, channel: str) -> dict:
    REQUESTS.labels(channel).inc()
    out = await app.state.graph.ainvoke({"session_id": session_id, "user_input": message})
    return {"response": out.get("response", ""), "handoff": out.get("handoff", False)}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    code, body = await readiness(app.state.llm, app.state.sessions, app.state.memory)
    return JSONResponse(body, status_code=code)


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/tools")
async def tools_docs():
    return PlainTextResponse(registry.docs())


@app.post("/chat", dependencies=[Depends(require_api_key)])
async def chat(body: ChatIn):
    return await _run(body.session_id, body.message, "rest")


@app.websocket("/ws/{session_id}")
async def ws_chat(ws: WebSocket, session_id: str):
    if not websocket_authorized(ws):
        await ws.close(code=1008)  # policy violation
        return
    await ws.accept()
    try:
        while True:
            text = await ws.receive_text()
            await ws.send_json(await _run(session_id, text, "ws"))
    except WebSocketDisconnect:
        pass


@app.post("/webhooks/slack")
async def slack_webhook(request: Request):
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
    if event.get("type") == "message" and not event.get("bot_id"):
        return await _run(event.get("channel", "slack"), event.get("text", ""), "slack")
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
async def whatsapp_webhook(request: Request):
    body = await request.body()
    secret = get_settings().whatsapp_app_secret
    if not secret:
        raise HTTPException(503, "WHATSAPP_APP_SECRET is not configured")
    if not verify_meta_signature(secret, request.headers.get("x-hub-signature-256"), body):
        raise HTTPException(401, "invalid WhatsApp signature")
    data = json.loads(body)
    try:
        msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
        return await _run(msg["from"], msg["text"]["body"], "whatsapp")
    except (KeyError, IndexError):
        return {"ok": True}
