"""Outbound replies for chat channels (Slack, WhatsApp)."""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.tools.slack import SlackTool

log = logging.getLogger(__name__)

WHATSAPP_API = "https://graph.facebook.com/v20.0"
WHATSAPP_MAX_CHARS = 4096


async def send_slack(channel: str, text: str, transport: httpx.AsyncBaseTransport | None = None):
    result = await SlackTool(transport=transport).run(channel=channel, text=text)
    if result.startswith("error"):
        raise RuntimeError(result)


async def send_whatsapp(
    to: str,
    text: str,
    phone_number_id: str,
    transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    token = get_settings().whatsapp_token
    if not token:
        raise RuntimeError("WHATSAPP_TOKEN is not configured")
    async with httpx.AsyncClient(timeout=15, transport=transport) as client:
        resp = await client.post(
            f"{WHATSAPP_API}/{phone_number_id}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text[:WHATSAPP_MAX_CHARS]},
            },
        )
    resp.raise_for_status()
