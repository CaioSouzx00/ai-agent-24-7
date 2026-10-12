"""Sessão (Redis, Task 2.3) e memória de longo prazo (pgvector, Task 2.4)."""

from __future__ import annotations

import json

import redis.asyncio as redis


class SessionStore:
    def __init__(self, url: str, ttl: int = 86400):
        self._r = redis.from_url(url)
        self._ttl = ttl

    async def get(self, session_id: str) -> list[dict]:
        raw = await self._r.get(f"session:{session_id}")
        return json.loads(raw) if raw else []

    async def append(self, session_id: str, message: dict) -> None:
        history = await self.get(session_id)
        history.append(message)
        await self._r.set(f"session:{session_id}", json.dumps(history), ex=self._ttl)


SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT now()
);
"""


class LongTermMemory:
    """TODO(Task 2.4): gerar embeddings (NIM embeddings) e buscar por similaridade."""

    def __init__(self, dsn: str):
        self.dsn = dsn

    async def search(self, query: str, k: int = 5) -> list[str]:
        return []
