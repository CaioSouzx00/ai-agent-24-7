"""Tests for session history and long-term memory wiring (Tasks 2.3 / 2.4)."""

import httpx

from app.agent.graph import build_graph
from app.llm.base import LLMProvider, LLMResponse
from app.llm.nim import NIMProvider
from app.memory import MAX_HISTORY, InMemorySessionStore, LongTermMemory, _vec
from app.tools.base import ToolRegistry


class RecordingLLM(LLMProvider):
    def __init__(self):
        self.calls: list[list[dict]] = []

    async def chat(self, messages, tools=None, temperature=0.2):
        self.calls.append(messages)
        return LLMResponse(f"reply{len(self.calls)}")


class FakeMemory:
    def __init__(self, fail=False):
        self.added: list[tuple[str, str]] = []
        self.fail = fail

    async def search(self, user_id, query, k=5):
        if self.fail:
            raise RuntimeError("db down")
        return [f"remembered:{m}" for _, m in self.added]

    async def add(self, user_id, content):
        if self.fail:
            raise RuntimeError("db down")
        self.added.append((user_id, content))


async def test_session_history_is_sent_on_next_turn():
    llm, store = RecordingLLM(), InMemorySessionStore()
    graph = build_graph(llm, ToolRegistry(), store)
    await graph.ainvoke({"session_id": "a", "user_input": "first"})
    await graph.ainvoke({"session_id": "a", "user_input": "second"})
    second_call = llm.calls[1]
    assert [m["content"] for m in second_call[1:]] == ["first", "reply1", "second"]


async def test_sessions_are_isolated():
    llm, store = RecordingLLM(), InMemorySessionStore()
    graph = build_graph(llm, ToolRegistry(), store)
    await graph.ainvoke({"session_id": "a", "user_input": "from a"})
    await graph.ainvoke({"session_id": "b", "user_input": "from b"})
    assert [m["content"] for m in llm.calls[1][1:]] == ["from b"]


async def test_history_is_capped():
    store = InMemorySessionStore()
    for i in range(MAX_HISTORY):
        await store.append("s", {"role": "user", "content": str(i)}, {"role": "assistant"})
    assert len(await store.get("s")) == MAX_HISTORY


async def test_long_term_memory_used_and_saved():
    llm, mem = RecordingLLM(), FakeMemory()
    graph = build_graph(llm, ToolRegistry(), None, mem)
    await graph.ainvoke({"session_id": "u", "user_input": "my name is Caio"})
    await graph.ainvoke({"session_id": "u", "user_input": "who am I?"})
    assert mem.added == [("u", "my name is Caio"), ("u", "who am I?")]
    assert "remembered:my name is Caio" in llm.calls[1][0]["content"]


async def test_handoff_turn_not_saved_to_memory():
    mem = FakeMemory()
    graph = build_graph(RecordingLLM(), ToolRegistry(), None, mem)
    await graph.ainvoke({"session_id": "u", "user_input": "I need a lawyer"})
    assert mem.added == []


async def test_memory_failures_do_not_break_the_agent():
    graph = build_graph(RecordingLLM(), ToolRegistry(), None, FakeMemory(fail=True))
    out = await graph.ainvoke({"session_id": "u", "user_input": "hi"})
    assert out["response"] == "reply1"


async def test_nim_embed_orders_by_index():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/embeddings"
        data = [
            {"index": 1, "embedding": [2.0]},
            {"index": 0, "embedding": [1.0]},
        ]
        return httpx.Response(200, json={"data": data})

    p = NIMProvider("http://x/v1", "m", transport=httpx.MockTransport(handler))
    assert await p.embed(["a", "b"]) == [[1.0], [2.0]]


class FakePool:
    def __init__(self):
        self.executed = []

    async def execute(self, sql, *args):
        self.executed.append((sql, args))

    async def fetch(self, sql, *args):
        self.executed.append((sql, args))
        return [{"content": "hit"}]


class FakeEmbedLLM(LLMProvider):
    async def chat(self, *a, **k): ...

    async def embed(self, texts):
        return [[0.5, 0.25] for _ in texts]


async def test_longterm_memory_sql():
    pool = FakePool()
    mem = LongTermMemory(pool, FakeEmbedLLM())
    await mem.add("u", "fact")
    assert pool.executed[0][1] == ("u", "fact", "[0.50000000,0.25000000]")
    assert await mem.search("u", "q", k=3) == ["hit"]
    assert pool.executed[1][1][0] == "u" and pool.executed[1][1][2] == 3


def test_vec_format():
    assert _vec([1, 2.5]) == "[1.00000000,2.50000000]"
