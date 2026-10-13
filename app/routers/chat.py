"""Chat routing: REST /chat and real-time WebSocket /ws/{session_id} endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.config import get_settings
from app.ratelimit import check_rate_limit, limiter
from app.runner import run_agent
from app.security import require_api_key, websocket_authorized

router = APIRouter(tags=["chat"])


class ChatIn(BaseModel):
    session_id: str
    message: str


@router.post("/chat", dependencies=[Depends(require_api_key), Depends(check_rate_limit)])
async def chat(request: Request, body: ChatIn) -> dict:
    """Process a single conversational turn via standard REST API."""
    return await run_agent(request.app, body.session_id, body.message, "rest")


@router.websocket("/ws/{session_id}")
async def ws_chat(ws: WebSocket, session_id: str) -> None:
    """Duplex real-time chat via WebSocket with streaming and continuous rate limiting."""
    if not websocket_authorized(ws):
        await ws.close(code=1008)  # Policy violation
        return
    await ws.accept()
    try:
        while True:
            text = await ws.receive_text()
            res = await limiter.is_allowed(
                f"ws:{session_id}",
                limit=get_settings().rate_limit_per_minute,
                window_seconds=60,
            )
            if not res.allowed:
                await ws.send_json({"error": "rate_limited", "retry_after": res.retry_after})
                continue
            await ws.send_json(await run_agent(ws.app, session_id, text, "ws"))
    except WebSocketDisconnect:
        pass
