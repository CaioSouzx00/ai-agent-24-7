"""Sessions (Redis, Task 2.3) and long-term memory (pgvector, Task 2.4)."""

from __future__ import annotations

import json
import logging
from typing import Protocol

from app.llm.base import LLMProvider

log = logging.getLogger(__name__)

MAX_HISTORY = 20


class SessionBackend(Protocol):
    async def get(self, session_id: str) -> list[dict]: ...

    async def append(self, session_id: str, *messages: dict) -> None: ...


class InMemorySessionStore:
    """Process-local fallback used in tests and when Redis is unavailable."""

    def __init__(self) -> None:
        self._data: dict[str, list[dict]] = {}

    async def get(self, session_id: str) -> list[dict]:
        return list(self._data.get(session_id, []))

    async def append(self, session_id: str, *messages: dict) -> None:
        hist = self._data.setdefault(session_id, [])
        hist.extend(messages)
        del hist[:-MAX_HISTORY]


class SessionStore:
    """Redis-backed conversation history with TTL."""

    def __init__(self, url: str, ttl: int = 86400):
        import redis.asyncio as redis

        self._r = redis.from_url(url)
        self._ttl = ttl

    async def ping(self) -> bool:
        try:
            return bool(await self._r.ping())
        except Exception:  # noqa: BLE001
            return False

    async def get(self, session_id: str) -> list[dict]:
        raw = await self._r.get(f"session:{session_id}")
        return json.loads(raw) if raw else []

    async def append(self, session_id: str, *messages: dict) -> None:
        history = await self.get(session_id)
        history.extend(messages)
        await self._r.set(f"session:{session_id}", json.dumps(history[-MAX_HISTORY:]), ex=self._ttl)


EMBED_DIM = 1024  # nvidia/nv-embedqa-e5-v5

SCHEMA_SQL = f"""
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector({EMBED_DIM}),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memories_user_idx ON memories (user_id);
"""


def _vec(values: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in values) + "]"


class LongTermMemory:
    """Semantic memory in PostgreSQL + pgvector, embeddings from the LLM provider."""

    def __init__(self, pool, llm: LLMProvider):
        self._pool = pool
        self._llm = llm

    @classmethod
    async def connect(cls, dsn: str, llm: LLMProvider) -> LongTermMemory:
        import asyncpg

        pool = await asyncpg.create_pool(dsn, min_size=1, max_size=5, timeout=5)
        async with pool.acquire() as conn:
            await conn.execute(SCHEMA_SQL)
        return cls(pool, llm)

    async def add(self, user_id: str, content: str) -> None:
        emb = (await self._llm.embed([content]))[0]
        await self._pool.execute(
            "INSERT INTO memories (user_id, content, embedding) VALUES ($1, $2, $3::vector)",
            user_id,
            content,
            _vec(emb),
        )

    async def search(self, user_id: str, query: str, k: int = 5) -> list[str]:
        emb = (await self._llm.embed([query]))[0]
        rows = await self._pool.fetch(
            "SELECT content FROM memories WHERE user_id = $1 "
            "ORDER BY embedding <=> $2::vector LIMIT $3",
            user_id,
            _vec(emb),
            k,
        )
        return [r["content"] for r in rows]

    async def ping(self) -> bool:
        try:
            await self._pool.fetchval("SELECT 1")
            return True
        except Exception:  # noqa: BLE001
            return False
