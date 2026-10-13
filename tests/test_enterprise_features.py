"""Tests for enterprise features:
- Gmail Cloud Pub/Sub push webhook & channel
- Lightweight multi-tenancy (memory & tickets isolation)
- Business metrics tracker and telemetry endpoint
"""

import base64
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.channels import send_gmail
from app.config import get_settings
from app.main import app
from app.memory import InMemorySessionStore, SessionStore
from app.metrics import BUSINESS_TRACKER, BusinessMetricsTracker
from app.tickets import InMemoryTicketStore


@pytest.fixture(autouse=True)
def _clear_settings():
    yield
    get_settings.cache_clear()


# ============================================================================
# 1. GMAIL CLOUD PUB/SUB TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_gmail_pubsub_unauthorized_when_token_configured(monkeypatch):
    monkeypatch.setenv("GMAIL_PUBSUB_VERIFICATION_TOKEN", "super-secret-token")
    get_settings.cache_clear()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Sem token
        resp = await client.post("/webhooks/gmail", json={"message": {"data": ""}})
        assert resp.status_code == 403
        assert "invalid Gmail Pub/Sub verification token" in resp.json()["detail"]

        # Token errado
        resp_bad = await client.post(
            "/webhooks/gmail?token=wrong-token",
            json={"message": {"data": ""}},
        )
        assert resp_bad.status_code == 403


@pytest.mark.asyncio
async def test_gmail_pubsub_authorized_via_query_and_bearer(monkeypatch):
    monkeypatch.setenv("GMAIL_PUBSUB_VERIFICATION_TOKEN", "pubsub-secret")
    get_settings.cache_clear()

    # Mensagem codificada em base64 seguindo estrutura oficial de notificacoes Pub/Sub do Gmail
    payload_data = json.dumps({
        "emailAddress": "client@example.com",
        "historyId": "987654",
        "snippet": "Need urgent technical assistance",
        "from": "client@example.com",
    }).encode("utf-8")
    b64_data = base64.b64encode(payload_data).decode("utf-8")

    body = {
        "message": {
            "data": b64_data,
            "messageId": "msg-999",
        }
    }

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        with patch("app.main._reply", new_callable=AsyncMock) as mock_reply:
            # Via query param ?token=
            resp = await client.post("/webhooks/gmail?token=pubsub-secret", json=body)
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["email_address"] == "client@example.com"
            assert data["history_id"] == "987654"
            assert mock_reply.called

            # Via Authorization: Bearer
            mock_reply.reset_mock()
            headers = {"Authorization": "Bearer pubsub-secret"}
            resp_bearer = await client.post("/webhooks/gmail", json=body, headers=headers)
            assert resp_bearer.status_code == 200
            assert resp_bearer.json()["ok"] is True
            assert mock_reply.called


@pytest.mark.asyncio
async def test_gmail_pubsub_invalid_body_or_data():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Invalid JSON body
        resp = await client.post(
            "/webhooks/gmail",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 400

        # Sem message data -> ignora com ack
        resp_no_data = await client.post("/webhooks/gmail", json={"message": {}})
        assert resp_no_data.status_code == 200
        assert resp_no_data.json()["status"] == "ignored_no_data"

        # Base64 corrompido -> trata como malformed_data
        resp_b64 = await client.post(
            "/webhooks/gmail",
            json={"message": {"data": "!!!not_base64!!!"}},
        )
        assert resp_b64.status_code == 200
        assert resp_b64.json()["status"] == "malformed_data"


@pytest.mark.asyncio
async def test_send_gmail_channel():
    from app.tools.google import GmailTool

    with patch.object(GmailTool, "run", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = "Email sent: msg_123"
        await send_gmail("dest@example.com", "Support Ticket", "Hello from agent")
        mock_run.assert_called_once()
        args = mock_run.call_args[1]
        assert args["to"] == "dest@example.com"
        assert args["subject"] == "Support Ticket"
        assert args["body"] == "Hello from agent"


# ============================================================================
# 2. MULTI-TENANCY TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_in_memory_session_store_tenant_isolation():
    store = InMemorySessionStore()
    session_id = "user-123"

    # Salva no tenant A (*messages: dict)
    await store.append(
        session_id,
        {"role": "user", "content": "hello tenant A"},
        tenant_id="tenant_a",
    )

    # Salva no tenant B com o MESMO session_id
    await store.append(
        session_id,
        {"role": "user", "content": "hello tenant B"},
        tenant_id="tenant_b",
    )

    # Historico de tenant A
    hist_a = await store.get(session_id, tenant_id="tenant_a")
    assert len(hist_a) == 1
    assert hist_a[0]["content"] == "hello tenant A"

    # Historico de tenant B
    hist_b = await store.get(session_id, tenant_id="tenant_b")
    assert len(hist_b) == 1
    assert hist_b[0]["content"] == "hello tenant B"

    # Historico default nao enxerga os outros
    hist_default = await store.get(session_id, tenant_id="default")
    assert len(hist_default) == 0


def test_session_store_redis_key_generation():
    store = SessionStore.__new__(SessionStore)
    store._ttl = 86400

    # Default tenant preserva chave retrocompativel
    assert store._key("abc", "default") == "session:abc"

    # Tenant personalizado prefixa tenant_id
    assert store._key("abc", "client_xyz") == "tenant:client_xyz:session:abc"


@pytest.mark.asyncio
async def test_in_memory_ticket_store_tenant_isolation():
    store = InMemoryTicketStore()

    t1 = await store.create(
        session_id="s1",
        channel="web",
        meta={"tenant_id": "tenant_1"},
        messages=[{"role": "user", "content": "help"}],
        reason="help",
        tenant_id="tenant_1",
    )
    t2 = await store.create(
        session_id="s1",
        channel="web",
        meta={"tenant_id": "tenant_2"},
        messages=[{"role": "user", "content": "billing"}],
        reason="billing",
        tenant_id="tenant_2",
    )

    # Listagem por tenant
    list_t1 = await store.list(tenant_id="tenant_1")
    assert len(list_t1) == 1
    assert list_t1[0].id == t1.id

    list_t2 = await store.list(tenant_id="tenant_2")
    assert len(list_t2) == 1
    assert list_t2[0].id == t2.id

    # Sem filtro de tenant lista todos
    list_all = await store.list()
    assert len(list_all) == 2

    # active_for isola por tenant
    active_t1 = await store.active_for("s1", tenant_id="tenant_1")
    assert active_t1 is not None and active_t1.id == t1.id

    active_t2 = await store.active_for("s1", tenant_id="tenant_2")
    assert active_t2 is not None and active_t2.id == t2.id

    active_other = await store.active_for("s1", tenant_id="unknown_tenant")
    assert active_other is None


@pytest.mark.asyncio
async def test_handoff_api_tenant_filtering(monkeypatch):
    monkeypatch.setenv("API_KEYS", "test-key")
    get_settings.cache_clear()

    ticket_store = InMemoryTicketStore()
    app.state.tickets = ticket_store

    t_alpha = await ticket_store.create(
        session_id="s1",
        channel="web",
        meta={"tenant_id": "alpha"},
        messages=[],
        reason="q",
        tenant_id="alpha",
    )
    t_beta = await ticket_store.create(
        session_id="s2",
        channel="web",
        meta={"tenant_id": "beta"},
        messages=[],
        reason="q",
        tenant_id="beta",
    )

    headers = {"X-API-Key": "test-key"}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Filtro via query parameter ?tenant_id=alpha
        resp = await client.get("/handoff/tickets?tenant_id=alpha", headers=headers)
        assert resp.status_code == 200
        tickets = resp.json()
        assert len(tickets) == 1
        assert tickets[0]["id"] == t_alpha.id

        # Filtro via header X-Tenant-ID: beta
        headers_beta = {"X-API-Key": "test-key", "X-Tenant-ID": "beta"}
        resp_h = await client.get("/handoff/tickets", headers=headers_beta)
        assert resp_h.status_code == 200
        tickets_h = resp_h.json()
        assert len(tickets_h) == 1
        assert tickets_h[0]["id"] == t_beta.id


# ============================================================================
# 3. BUSINESS METRICS TESTS
# ============================================================================

def test_business_metrics_tracker_logic():
    tracker = BusinessMetricsTracker()

    tracker.record_tool("web_search", 0.10, success=True)
    tracker.record_tool("web_search", 0.20, success=True)
    tracker.record_tool("github_issue", 0.80, success=False)

    tracker.record_handoff("slack", "tenant_a")
    tracker.record_handoff("whatsapp", "tenant_b")

    summary = tracker.get_summary()

    # Handoffs
    assert summary["handoffs"]["last_24h"] == 2
    assert summary["handoffs"]["by_channel"]["slack"] == 1
    assert summary["handoffs"]["by_channel"]["whatsapp"] == 1
    assert summary["handoffs"]["by_tenant"]["tenant_a"] == 1

    # Top tools
    top = {item["tool"]: item["calls"] for item in summary["tools"]["ranking"]}
    assert top["web_search"] == 2
    assert top["github_issue"] == 1

    # Tool latencies
    latencies = summary["tools"]["latency"]
    assert "web_search" in latencies
    assert latencies["web_search"]["total_samples"] == 2
    assert latencies["web_search"]["avg_seconds"] == 0.15
    assert "github_issue" in latencies


@pytest.mark.asyncio
async def test_get_business_metrics_endpoint():
    BUSINESS_TRACKER.record_tool("mock_tool", 0.05, success=True)
    BUSINESS_TRACKER.record_handoff("web", "corp_test")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/metrics/business")
        assert resp.status_code == 200
        data = resp.json()

        assert "handoffs" in data
        assert "tools" in data
        assert data["handoffs"]["last_24h"] >= 1
        assert "ranking" in data["tools"]
        assert "latency" in data["tools"]
