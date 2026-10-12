"""Unit tests for user and API key rate limiting (Task 10)."""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.ratelimit import RateLimiter, check_rate_limit, limiter


@pytest.mark.asyncio
async def test_sliding_window_allows_within_limit():
    rl = RateLimiter()
    for _ in range(5):
        res = await rl.is_allowed("user-1", limit=5, window_seconds=10)
        assert res.allowed is True
    # 6th request should be rejected
    res = await rl.is_allowed("user-1", limit=5, window_seconds=10)
    assert res.allowed is False
    assert res.retry_after > 0
    assert res.remaining == 0


@pytest.mark.asyncio
async def test_sliding_window_isolates_keys():
    rl = RateLimiter()
    for _ in range(3):
        await rl.is_allowed("user-a", limit=3, window_seconds=10)
    assert (await rl.is_allowed("user-a", limit=3, window_seconds=10)).allowed is False
    # user-b is unaffected
    assert (await rl.is_allowed("user-b", limit=3, window_seconds=10)).allowed is True


def test_fastapi_rate_limit_middleware_429():
    app = FastAPI()

    @app.get("/test", dependencies=[Depends(check_rate_limit)])
    async def endpoint():
        return {"ok": True}

    client = TestClient(app)
    settings = get_settings()
    original_limit = settings.rate_limit_per_minute
    settings.rate_limit_per_minute = 3
    settings.rate_limit_enabled = True

    try:
        # 3 allowed requests
        for _ in range(3):
            r = client.get("/test", headers={"X-API-Key": "test-key-123"})
            assert r.status_code == 200

        # 4th request gets 429
        r = client.get("/test", headers={"X-API-Key": "test-key-123"})
        assert r.status_code == 429
        assert "Retry-After" in r.headers
        assert r.headers["X-RateLimit-Limit"] == "3"
        assert r.json()["detail"] == "Rate limit exceeded. Please try again later."
    finally:
        settings.rate_limit_per_minute = original_limit
