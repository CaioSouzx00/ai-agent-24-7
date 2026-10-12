"""Vision tool (Task 3.7): Analyze images using multimodal LLMs (NVIDIA / OpenAI format)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.tools.base import BaseTool

log = logging.getLogger(__name__)


class ImageAnalysisTool(BaseTool):
    name = "image_analysis"
    description = (
        "Analyze an image with a multimodal LLM. Provide an image URL (http/https or "
        "base64 data URI) and a question or prompt."
    )
    parameters = {
        "type": "object",
        "properties": {
            "image_url": {
                "type": "string",
                "description": "Public URL or base64 data URI (data:image/...) of the image to analyze",
            },
            "prompt": {
                "type": "string",
                "description": "Question or instructions about what to analyze in the image",
            },
        },
        "required": ["image_url"],
    }

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url
        self._model = model
        self._api_key = api_key
        self._transport = transport

    async def run(self, **kwargs: Any) -> str:
        s = get_settings()
        base_url = (self._base_url or s.nim_base_url).rstrip("/")
        api_key = self._api_key if self._api_key is not None else s.nim_api_key
        model = self._model or s.vision_model or s.nim_model
        image_url = kwargs.get("image_url", "").strip()
        prompt = kwargs.get("prompt") or "Describe this image in detail."

        if not image_url:
            return "error: image_url is required"

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.2,
        }

        headers = {"Content-Type": "application/json"}
        if api_key and api_key != "not-needed-locally":
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            async with httpx.AsyncClient(timeout=60.0, transport=self._transport) as client:
                resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if not resp.is_success:
                return f"error: vision API returned status {resp.status_code}: {resp.text[:300]}"
            data = resp.json()
            content = data["choices"][0]["message"].get("content") or ""
            return content.strip() or "(no description returned)"
        except Exception as exc:
            log.exception("vision tool failed: %s", exc)
            return f"error: {exc}"
