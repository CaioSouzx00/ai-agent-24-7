"""Slack tool (Task 3.5): post messages via the Slack Web API."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.tools.base import BaseTool


class SlackTool(BaseTool):
    name = "slack_send_message"
    description = "Send a message to a Slack channel (ID or #name) as the bot."
    parameters = {
        "type": "object",
        "properties": {
            "channel": {"type": "string", "description": "Channel ID or name, e.g. #general"},
            "text": {"type": "string"},
        },
        "required": ["channel", "text"],
    }

    def __init__(self, token: str | None = None, transport: httpx.AsyncBaseTransport | None = None):
        self._token = token
        self._transport = transport

    async def run(self, **kwargs: Any) -> str:
        token = self._token if self._token is not None else get_settings().slack_bot_token
        if not token:
            return "error: SLACK_BOT_TOKEN is not configured"
        async with httpx.AsyncClient(timeout=15, transport=self._transport) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": kwargs["channel"], "text": kwargs["text"]},
            )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            return f"error: slack API returned '{data.get('error', 'unknown')}'"
        return f"message sent to {kwargs['channel']} (ts={data.get('ts')})"
