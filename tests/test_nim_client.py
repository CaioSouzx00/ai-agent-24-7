"""Tests for the NIM client against a mocked OpenAI-compatible server (Tasks 1.2/1.3)."""

import json

import httpx

from app.llm.nim import NIMProvider

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather",
            "parameters": {"type": "object", "properties": {"city": {"type": "string"}}},
        },
    }
]


def make_provider(handler) -> NIMProvider:
    return NIMProvider(
        "http://nim.test/v1", "test-model", "key", transport=httpx.MockTransport(handler)
    )


async def test_plain_chat():
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert request.url.path == "/v1/chat/completions"
        assert body["model"] == "test-model"
        assert "tools" not in body
        assert request.headers["authorization"] == "Bearer key"
        return httpx.Response(200, json={"choices": [{"message": {"content": "hi there"}}]})

    r = await make_provider(handler).chat([{"role": "user", "content": "hi"}])
    assert r.content == "hi there"
    assert r.tool_calls == []


async def test_function_calling_parsed():
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["tools"] == TOOLS and body["tool_choice"] == "auto"
        msg = {
            "content": None,
            "tool_calls": [
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {"name": "get_weather", "arguments": '{"city": "Recife"}'},
                }
            ],
        }
        return httpx.Response(200, json={"choices": [{"message": msg}]})

    r = await make_provider(handler).chat([{"role": "user", "content": "weather?"}], tools=TOOLS)
    assert r.content == ""
    assert r.tool_calls[0].name == "get_weather"
    assert r.tool_calls[0].arguments == {"city": "Recife"}
    assert r.tool_calls[0].id == "call_1"
