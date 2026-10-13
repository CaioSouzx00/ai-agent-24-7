"""Real integration tests for PostgreSQL (with pgvector) and Redis (Task 2 & 6).

These tests execute actual network socket operations against live PostgreSQL and Redis
instances when available, validating schema execution, persistence, and vector recall.
If services are not reachable on the host, the tests skip gracefully with a descriptive message.
"""

from __future__ import annotations

import os
import uuid

import pytest

from app.config import get_settings
from app.llm.base import LLMProvider
from app.memory import EMBED_DIM, LongTermMemory, SessionStore
from app.tickets import RedisTicketStore


class DummyEmbedLLM(LLMProvider):
    async def chat(self, *a, **k):
        return "dummy"

    async def embed(self, texts: list[str]) -> list[list[float]]:
        # Return deterministic distinct 1024-dimension unit vectors
        results = []
        for text in texts:
            vec = [0.0] * EMBED_DIM
            if "python" in text.lower():
                vec[0] = 1.0
                vec[1] = 0.5
            else:
                vec[10] = 1.0
                vec[11] = 0.5
            results.append(vec)
        return results


@pytest.fixture
def settings():
    return get_settings()


@pytest.mark.asyncio
async def test_real_redis_integration_lifecycle(settings):
    """Test real Redis session history and ticket lifecycle."""
    import redis.asyncio as redis

    redis_url = os.getenv("TEST_REDIS_URL", settings.redis_url)
    client = redis.from_url(redis_url)

    try:
        await client.ping()
    except Exception as exc:
        pytest.skip(f"Live Redis is not available at {redis_url}: {exc}")

    test_prefix = f"test_{uuid.uuid4().hex[:8]}"

    try:
        # 1. Real SessionStore integration
        session_store = SessionStore(url=redis_url, ttl=60)
        test_session_id = f"{test_prefix}_session"
        await session_store.append(
            test_session_id,
            {"role": "user", "content": "Hello real Redis"},
            {"role": "assistant", "content": "Connected and persisted"},
        )
        history = await session_store.get(test_session_id)
        assert len(history) == 2
        assert history[0]["content"] == "Hello real Redis"
        assert history[1]["content"] == "Connected and persisted"

        # 2. Real RedisTicketStore integration
        ticket_store = RedisTicketStore(client)
        ticket = await ticket_store.create(
            session_id=test_session_id,
            channel="web",
            meta={"ip": "127.0.0.1"},
            messages=[{"role": "user", "content": "I need help with billing"}],
            reason="billing issue",
        )
        assert ticket.id is not None
        assert ticket.status == "open"

        # Active lookup
        active = await ticket_store.active_for(test_session_id)
        assert active is not None
        assert active.id == ticket.id

        # Claim
        claimed = await ticket_store.claim(ticket.id, "operator_real")
        assert claimed is not None
        assert claimed.status == "claimed"
        assert claimed.assignee == "operator_real"

        # Resolve
        resolved = await ticket_store.resolve(ticket.id)
        assert resolved is not None
        assert resolved.status == "resolved"
        assert await ticket_store.active_for(test_session_id) is None

    finally:
        # Cleanup test keys
        keys = await client.keys(f"*{test_prefix}*")
        if keys:
            await client.delete(*keys)
        await client.aclose()


@pytest.mark.asyncio
async def test_real_postgres_pgvector_integration_lifecycle(settings):
    """Test real PostgreSQL connection, pgvector table schema, insertion, and similarity search."""
    import asyncpg

    db_url = os.getenv("TEST_DATABASE_URL", settings.database_url)

    try:
        conn = await asyncpg.connect(db_url, timeout=3)
        await conn.close()
    except Exception as exc:
        pytest.skip(f"Live PostgreSQL is not available at {db_url}: {exc}")

    llm = DummyEmbedLLM()
    user_id = f"user_real_{uuid.uuid4().hex[:8]}"

    try:
        mem = await LongTermMemory.connect(db_url, llm)
        assert await mem.ping() is True

        # Insert real vector memories
        await mem.add(user_id, "User enjoys programming in Python and async systems.")
        await mem.add(user_id, "User is interested in culinary recipes and Italian cuisine.")

        # Similarity search matching Python
        results = await mem.search(user_id, "Which programming language does the user know?", k=1)
        assert len(results) == 1
        assert "Python" in results[0]

        # Similarity search matching cooking
        results_cooking = await mem.search(user_id, "What food does the user like?", k=1)
        assert len(results_cooking) == 1
        assert "culinary" in results_cooking[0]

    finally:
        # Cleanup user rows
        pool = await asyncpg.create_pool(db_url, min_size=1, max_size=2)
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM memories WHERE user_id = $1", user_id)
        await pool.close()
