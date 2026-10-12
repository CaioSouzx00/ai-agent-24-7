"""Cliente para NVIDIA NIM (API compatível com OpenAI) — Tasks 1.2 e 1.3."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.llm.base import LLMProvider, LLMResponse, ToolCall


class NIMProvider(LLMProvider):
    def __init__(self, base_url: str, model: str, api_key: str = "", timeout: float = 120.0):
        self.model = model
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )

    async def chat(self, messages, tools=None, temperature=0.2) -> LLMResponse:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        resp = await self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        msg = resp.json()["choices"][0]["message"]
        calls = [
            ToolCall(
                id=tc.get("id", ""),
                name=tc["function"]["name"],
                arguments=json.loads(tc["function"].get("arguments") or "{}"),
            )
            for tc in msg.get("tool_calls") or []
        ]
        return LLMResponse(content=msg.get("content") or "", tool_calls=calls)

    async def aclose(self) -> None:
        await self._client.aclose()
