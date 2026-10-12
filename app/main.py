"""FastAPI: health checks, REST/WebSocket chat and webhooks (Phases 2, 4, 5)."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from pydantic import BaseModel

from app.agent.graph import build_graph
from app.config import get_settings
from app.llm import get_llm
from app.tools import integrations  # noqa: F401  (registers tools)
from app.tools.base import registry

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
    app.state.graph = build_graph(get_llm(), registry)
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
    return {"status": "ready"}  # TODO(Task 5.3): check Redis/Postgres/LLM


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/tools")
async def tools_docs():
    return PlainTextResponse(registry.docs())


@app.post("/chat")
async def chat(body: ChatIn):
    return await _run(body.session_id, body.message, "rest")


@app.websocket("/ws/{session_id}")
async def ws_chat(ws: WebSocket, session_id: str):
    await ws.accept()
    while True:
        text = await ws.receive_text()
        await ws.send_json(await _run(session_id, text, "ws"))


@app.post("/webhooks/slack")
async def slack_webhook(request: Request):
    payload = await request.json()
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
    if mode == "subscribe" and token == get_settings().whatsapp_verify_token:
        return PlainTextResponse(challenge)
    raise HTTPException(403)


@app.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    data = await request.json()
    try:
        msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
        return await _run(msg["from"], msg["text"]["body"], "whatsapp")
    except (KeyError, IndexError):
        return {"ok": True}
