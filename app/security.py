"""Channel and API security (Tasks 4.1-4.5): webhook signatures, API keys, and JWT auth.

Supports:
- Webhook HMAC SHA-256 signatures for Slack (with replay protection) and WhatsApp (Meta).
- Static API keys via header `Authorization: Bearer <key>` or `X-API-Key: <key>`.
- JWT authentication for user tokens (Auth0, Clerk, Firebase, or custom tokens).
- Fails closed in production; allows unauthenticated access in dev when no auth configured.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any

import jwt
from fastapi import HTTPException, Request, WebSocket

from app.config import Settings, get_settings

log = logging.getLogger(__name__)

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


def is_jwt(token: str) -> bool:
    """Returns True if the token has the standard JWT 3-part structure."""
    parts = token.split(".")
    return len(parts) == 3


def verify_jwt(token: str, settings: Settings) -> dict[str, Any]:
    """Verify and decode a JWT token using HS256 secret, RS256 JWKS, or dev fallback."""
    options = {}
    if not settings.jwt_audience:
        options["verify_aud"] = False

    kwargs: dict[str, Any] = {"options": options}
    if settings.jwt_audience:
        kwargs["audience"] = settings.jwt_audience
    if settings.jwt_issuer:
        kwargs["issuer"] = settings.jwt_issuer

    if settings.jwt_secret:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256", "HS384", "HS512"],
            **kwargs,
        )

    if settings.jwt_jwks_url:
        jwks_client = jwt.PyJWKClient(settings.jwt_jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "RS384", "RS512", "ES256"],
            **kwargs,
        )

    # In dev mode with no JWT verification configured, parse payload without signature check
    if settings.app_env == "dev":
        return jwt.decode(token, options={"verify_signature": False})

    raise jwt.InvalidTokenError("JWT validation configured but secret/JWKS missing")


def api_key_allowed(settings: Settings, presented: str | None) -> bool:
    keys = [k.strip() for k in settings.api_keys.split(",") if k.strip()]
    if not keys:
        return settings.app_env == "dev"
    return bool(presented) and any(_eq(k, presented) for k in keys)


def _extract_token(authorization: str | None, x_api_key: str | None) -> str | None:
    if x_api_key:
        return x_api_key.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


async def require_auth(request: Request) -> dict[str, Any]:
    """Authenticates request via JWT or API Key, storing user in request.state.user."""
    token = _extract_token(request.headers.get("authorization"), request.headers.get("x-api-key"))
    settings = get_settings()

    # 1. Dev mode with no credentials configured -> open access
    has_jwt_config = bool(settings.jwt_secret or settings.jwt_jwks_url)
    has_key_config = bool([k.strip() for k in settings.api_keys.split(",") if k.strip()])
    if not has_jwt_config and not has_key_config and settings.app_env in ("dev", "test"):
        user = {"sub": "dev_user", "role": "dev"}
        request.state.user = user
        return user

    if not token:
        raise HTTPException(401, "invalid or missing authentication credential")

    # 2. Try JWT if token has 3 parts
    if is_jwt(token):
        try:
            payload = verify_jwt(token, settings)
            request.state.user = payload
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "JWT token has expired") from None
        except jwt.PyJWTError as exc:
            log.warning("JWT validation failed: %s", exc)
            raise HTTPException(401, "invalid JWT token") from exc

    # 3. Fallback to API Key
    if api_key_allowed(settings, token):
        user = {"sub": "api_key_user", "key": token[:6] + "..."}
        request.state.user = user
        return user

    raise HTTPException(401, "invalid API key or JWT token")


# Backward compatibility alias
require_api_key = require_auth


def websocket_authorized(ws: WebSocket) -> bool:
    token = _extract_token(
        ws.headers.get("authorization"), ws.headers.get("x-api-key")
    ) or ws.query_params.get("api_key")
    settings = get_settings()

    has_jwt_config = bool(settings.jwt_secret or settings.jwt_jwks_url)
    has_key_config = bool([k.strip() for k in settings.api_keys.split(",") if k.strip()])
    if not has_jwt_config and not has_key_config and settings.app_env == "dev":
        return True

    if not token:
        return False

    if is_jwt(token):
        try:
            verify_jwt(token, settings)
            return True
        except jwt.PyJWTError:
            return False

    return api_key_allowed(settings, token)
