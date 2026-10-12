"""Sliding-window rate limiting per API key, session, or IP address (Task 10)."""

from __future__ import annotations

import asyncio
import hashlib
import time
from collections import defaultdict, deque
from typing import NamedTuple

from fastapi import HTTPException, Request

from app.config import get_settings
from app.metrics import RATELIMIT_EXCEEDED


class RateLimitResult(NamedTuple):
    allowed: bool
    remaining: int
    retry_after: int


class RateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self) -> None:
        self._history: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def is_allowed(
        self, key: str, limit: int = 60, window_seconds: int = 60
    ) -> RateLimitResult:
        """Check whether the request for `key` is allowed within `window_seconds`."""
        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            q = self._history[key]
            # Prune timestamps outside current window
            while q and q[0] <= cutoff:
                q.popleft()

            if len(q) < limit:
                q.append(now)
                return RateLimitResult(allowed=True, remaining=limit - len(q), retry_after=0)

            # Earliest timestamp dictates retry_after
            oldest = q[0]
            retry_after = max(1, int(window_seconds - (now - oldest)) + 1)
            return RateLimitResult(allowed=False, remaining=0, retry_after=retry_after)

    async def reset(self, key: str | None = None) -> None:
        """Clear all or key-specific history."""
        async with self._lock:
            if key is not None:
                self._history.pop(key, None)
            else:
                self._history.clear()


limiter = RateLimiter()


def resolve_identifier(request: Request, session_id: str | None = None) -> tuple[str, str]:
    """Resolve identifier type and unique rate limit key from incoming request."""
    # 1. API key from Authorization header or X-API-Key
    auth_header = request.headers.get("authorization", "")
    api_key_header = request.headers.get("x-api-key", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif api_key_header:
        token = api_key_header.strip()

    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        return "api_key", f"key:{token_hash}"

    # 2. Session ID if supplied
    if session_id:
        return "session", f"session:{session_id}"

    # 3. Client IP address
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return "ip", f"ip:{ip}"


async def check_rate_limit(request: Request, session_id: str | None = None) -> None:
    """FastAPI dependency to enforce rate limiting on incoming requests."""
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return

    id_type, key = resolve_identifier(request, session_id)
    limit = settings.rate_limit_per_minute
    res = await limiter.is_allowed(key, limit=limit, window_seconds=60)

    if not res.allowed:
        RATELIMIT_EXCEEDED.labels(identifier_type=id_type).inc()
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={
                "Retry-After": str(res.retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )
