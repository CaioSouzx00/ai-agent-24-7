"""Tests for readiness checks (Task 5.3)."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.health import readiness
from app.llm.base import LLMProvider
from app.llm.nim import NIMProvider
from app.main import app
from app.memory import InMemorySessionStore


class StubLLM(LLMProvider):
    def __init__(self, ok=True, raises=False):
        self.ok, self.raises = ok, raises

    async def chat(self, *a, **k): ...

    async def health(self):
        if self.raises:
            raise ConnectionError("refused")
        return self.ok


class Pingable:
    def __init__(self, ok=True):
        self.ok = ok

    async def ping(self):
        return self.ok


async def test_all_ok():
    code, body = await readiness(StubLLM(), Pingable(), Pingable())
    assert code == 200 and body["status"] == "ready"
    assert body["components"] == {"llm": "ok", "redis": "ok", "postgres": "ok"}


async def test_llm_down_is_not_ready():
    for llm in (StubLLM(ok=False), StubLLM(raises=True)):
        code, body = await readiness(llm, Pingable(), Pingable())
        assert code == 503 and body["status"] == "not_ready"
        assert body["components"]["llm"] == "down"


async def test_redis_or_postgres_down_is_degraded_not_failed():
    code, body = await readiness(StubLLM(), Pingable(False), Pingable(False))
    assert code == 200 and body["status"] == "degraded"
    assert body["components"]["redis"] == "down" and body["components"]["postgres"] == "down"


async def test_fallbacks_are_reported_as_degraded():
    code, body = await readiness(StubLLM(), InMemorySessionStore(), None)
    assert code == 200 and body["status"] == "degraded"
    assert "fallback" in body["components"]["redis"]
    assert "disabled" in body["components"]["postgres"]


async def test_nim_health_uses_models_endpoint():
    def ok(request):
        assert request.url.path == "/v1/models"
        return httpx.Response(200, json={"data": []})

    assert await NIMProvider("http://x/v1", "m", transport=httpx.MockTransport(ok)).health()
    bad = NIMProvider(
        "http://x/v1", "m", transport=httpx.MockTransport(lambda r: httpx.Response(401))
    )
    assert not await bad.health()


@pytest.mark.parametrize(("llm_ok", "status"), [(True, 200), (False, 503)])
def test_ready_endpoint(llm_ok, status):
    app.state.llm = StubLLM(ok=llm_ok)
    app.state.sessions = Pingable()
    app.state.memory = Pingable()
    r = TestClient(app).get("/ready")
    assert r.status_code == status
    assert r.json()["components"]["llm"] == ("ok" if llm_ok else "down")


async def test_readiness_fails_in_production_with_insecure_secrets():
    from app.config import Settings

    bad_prod_cfg = Settings(
        app_env="prod",
        api_keys="dev-secret-key",
        jwt_secret="",
    )
    code, body = await readiness(StubLLM(), Pingable(), Pingable(), settings=bad_prod_cfg)
    assert code == 503
    assert body["status"] == "not_ready"
    assert "insecure" in body["error"]
    assert body["components"]["security"] == "failed (insecure production secrets)"


async def test_readiness_succeeds_in_production_with_valid_secrets():
    from app.config import Settings

    good_prod_cfg = Settings(
        app_env="prod",
        api_keys="strong-production-api-token-xyz-987",
        nim_api_key="nvapi-production-key-valid",
        database_url="postgresql://prod_user:prod_pass@db.internal:5432/agent",
    )
    code, body = await readiness(StubLLM(), Pingable(), Pingable(), settings=good_prod_cfg)
    assert code == 200
    assert body["status"] == "ready"
