"""Handoff tickets (Tasks 6.2 / 6.4) and human alerting (Task 6.3).

While a ticket is active (open/claimed) the bot stays silent for that session and the
conversation is handled by a human through the /handoff API (or the /handoff/ui page).
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any

import httpx

log = logging.getLogger(__name__)

ACTIVE_STATUSES = ("open", "claimed")


@dataclass
class Ticket:
    id: str
    session_id: str
    channel: str
    meta: dict[str, Any] = field(default_factory=dict)
    status: str = "open"  # open -> claimed -> resolved
    assignee: str | None = None
    reason: str = ""
    created_at: float = field(default_factory=time.time)
    messages: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class InMemoryTicketStore:
    backend_name = "in-memory"

    def __init__(self) -> None:
        self._tickets: dict[str, Ticket] = {}

    async def create(
        self, session_id: str, channel: str, meta: dict, messages: list[dict], reason: str = ""
    ) -> Ticket:
        t = Ticket(uuid.uuid4().hex[:8], session_id, channel, dict(meta), reason=reason)
        t.messages = [dict(m) for m in messages]
        self._tickets[t.id] = t
        return t

    async def get(self, ticket_id: str) -> Ticket | None:
        return self._tickets.get(ticket_id)

    async def list(self, status: str | None = None) -> list[Ticket]:
        items = sorted(self._tickets.values(), key=lambda t: t.created_at, reverse=True)
        return [t for t in items if status is None or t.status == status]

    async def active_for(self, session_id: str) -> Ticket | None:
        for t in self._tickets.values():
            if t.session_id == session_id and t.status in ACTIVE_STATUSES:
                return t
        return None

    async def save(self, ticket: Ticket) -> None:
        self._tickets[ticket.id] = ticket

    async def add_message(self, ticket_id: str, role: str, content: str) -> Ticket | None:
        t = await self.get(ticket_id)
        if t:
            t.messages.append({"role": role, "content": content, "ts": time.time()})
            await self.save(t)
        return t

    async def claim(self, ticket_id: str, assignee: str) -> Ticket | None:
        t = await self.get(ticket_id)
        if t and t.status in ACTIVE_STATUSES:
            t.status, t.assignee = "claimed", assignee
            await self.save(t)
            return t
        return None

    async def resolve(self, ticket_id: str) -> Ticket | None:
        t = await self.get(ticket_id)
        if t:
            t.status = "resolved"
            await self.save(t)
        return t


class RedisTicketStore(InMemoryTicketStore):
    """Same behaviour, persisted in Redis (tickets survive restarts / multiple instances)."""

    backend_name = "redis"
    TTL = 30 * 86400

    def __init__(self, client) -> None:
        super().__init__()
        self._r = client

    async def ping(self) -> bool:
        try:
            return bool(await self._r.ping())
        except Exception:
            return False

    @staticmethod
    def _load(raw) -> Ticket:
        return Ticket(**json.loads(raw))

    async def save(self, ticket: Ticket) -> None:
        await self._r.set(f"ticket:{ticket.id}", json.dumps(ticket.to_dict()), ex=self.TTL)
        await self._r.zadd("tickets", {ticket.id: ticket.created_at})
        key = f"ticket_active:{ticket.session_id}"
        if ticket.status in ACTIVE_STATUSES:
            await self._r.set(key, ticket.id, ex=self.TTL)
        elif (await self._r.get(key)) in (ticket.id, ticket.id.encode()):
            await self._r.delete(key)

    async def create(self, session_id, channel, meta, messages, reason="") -> Ticket:
        t = Ticket(uuid.uuid4().hex[:8], session_id, channel, dict(meta), reason=reason)
        t.messages = [dict(m) for m in messages]
        await self.save(t)
        return t

    async def get(self, ticket_id: str) -> Ticket | None:
        raw = await self._r.get(f"ticket:{ticket_id}")
        return self._load(raw) if raw else None

    async def list(self, status: str | None = None) -> list[Ticket]:
        ids = await self._r.zrevrange("tickets", 0, 199)
        out = []
        for i in ids:
            t = await self.get(i.decode() if isinstance(i, bytes) else i)
            if t and (status is None or t.status == status):
                out.append(t)
        return out

    async def active_for(self, session_id: str) -> Ticket | None:
        tid = await self._r.get(f"ticket_active:{session_id}")
        if not tid:
            return None
        t = await self.get(tid.decode() if isinstance(tid, bytes) else tid)
        return t if t and t.status in ACTIVE_STATUSES else None


def format_alert(ticket: Ticket, public_url: str = "") -> str:
    last = next((m["content"] for m in reversed(ticket.messages) if m["role"] == "user"), "")
    lines = [
        f":raising_hand: Human handoff needed (ticket {ticket.id})",
        f"Channel: {ticket.channel} | Session: {ticket.session_id}",
        f"Reason: {ticket.reason or 'sensitive request'}",
        f"Last user message: {last[:300]}",
    ]
    if public_url:
        lines.append(f"Take over: {public_url.rstrip('/')}/handoff/ui")
    return "\n".join(lines)


async def notify_humans(
    ticket: Ticket,
    webhook_url: str,
    public_url: str = "",
    transport: httpx.AsyncBaseTransport | None = None,
) -> bool:
    """Post an alert to a Slack/Teams incoming webhook. Never raises."""
    if not webhook_url:
        log.warning("handoff ticket %s created but SLACK_HANDOFF_WEBHOOK is not set", ticket.id)
        return False
    try:
        async with httpx.AsyncClient(timeout=10, transport=transport) as client:
            resp = await client.post(webhook_url, json={"text": format_alert(ticket, public_url)})
        resp.raise_for_status()
        return True
    except Exception:  # noqa: BLE001
        log.exception("failed to send handoff alert for ticket %s", ticket.id)
        return False
