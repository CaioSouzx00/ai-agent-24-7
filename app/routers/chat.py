"""Chat routing: REST /chat and real-time WebSocket /ws/{session_id} endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import get_settings
from app.ratelimit import check_rate_limit, limiter
from app.runner import run_agent
from app.security import require_api_key, websocket_authorized

router = APIRouter(tags=["chat"])


class ChatIn(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "session_id": "sess_enterprise_101",
                    "message": "What are the latest enterprise pricing options?",
                    "tenant_id": "acme_corp",
                }
            ]
        }
    )

    session_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique session or conversation identifier",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User message text content",
    )
    tenant_id: str = Field(
        default="default",
        max_length=64,
        description="Tenant identifier for multi-tenant memory and isolation",
    )

    @field_validator("session_id", "message", "tenant_id", mode="before")
    @classmethod
    def _strip_strings(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


@router.post("/chat", dependencies=[Depends(require_api_key), Depends(check_rate_limit)])
async def chat(request: Request, body: ChatIn) -> dict:
    """Process a single conversational turn via standard REST API with multi-tenancy."""
    tenant = (
        body.tenant_id
        if body.tenant_id != "default"
        else (request.headers.get("x-tenant-id") or "default")
    )
    return await run_agent(
        request.app,
        body.session_id,
        body.message,
        "rest",
        meta={"tenant_id": tenant},
    )


@router.websocket("/ws/{session_id}")
async def ws_chat(ws: WebSocket, session_id: str) -> None:
    """Duplex real-time chat via WebSocket with streaming, multi-tenancy, and rate limiting."""
    if not websocket_authorized(ws):
        await ws.close(code=1008)  # Policy violation
        return
    await ws.accept()
    tenant = ws.query_params.get("tenant_id") or ws.headers.get("x-tenant-id") or "default"
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
            await ws.send_json(
                await run_agent(
                    ws.app,
                    session_id,
                    text,
                    "ws",
                    meta={"tenant_id": tenant},
                )
            )
    except WebSocketDisconnect:
        pass
