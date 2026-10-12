"""Channel security (Task 4.x): webhook signature checks and API-key auth.

Everything fails closed: a missing secret rejects the request, except API keys in
`APP_ENV=dev` (so local development works out of the box).
"""

from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import HTTPException, Request, WebSocket

from app.config import Settings, get_settings

SLACK_MAX_AGE_SECONDS = 300


def _eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


def verify_slack_signature(
    secret: str, timestamp: str | None, signature: str | None, body: bytes, now: float | None = None
) -> bool:
    if not secret or not timestamp or not signature:
        return False
    try:
        age = abs((now if now is not None else time.time()) - int(timestamp))
    except ValueError:
        return False
    if age > SLACK_MAX_AGE_SECONDS:
        return False
    base = b"v0:" + timestamp.encode() + b":" + body
    expected = "v0=" + hmac.new(secret.encode(), base, hashlib.sha256).hexdigest()
    return _eq(expected, signature)


def verify_meta_signature(secret: str, signature: str | None, body: bytes) -> bool:
    """WhatsApp Cloud API: X-Hub-Signature-256 = 'sha256=' + HMAC(app_secret, body)."""
    if not secret or not signature:
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return _eq(expected, signature)


def api_key_allowed(settings: Settings, presented: str | None) -> bool:
    keys = [k.strip() for k in settings.api_keys.split(",") if k.strip()]
    if not keys:
        return settings.app_env == "dev"
    return bool(presented) and any(_eq(k, presented) for k in keys)


def _extract_key(authorization: str | None, x_api_key: str | None) -> str | None:
    if x_api_key:
        return x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


async def require_api_key(request: Request) -> None:
    key = _extract_key(request.headers.get("authorization"), request.headers.get("x-api-key"))
    if not api_key_allowed(get_settings(), key):
        raise HTTPException(401, "invalid or missing API key")


def websocket_authorized(ws: WebSocket) -> bool:
    key = _extract_key(
        ws.headers.get("authorization"), ws.headers.get("x-api-key")
    ) or ws.query_params.get("api_key")
    return api_key_allowed(get_settings(), key)
