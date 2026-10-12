"""Human handoff API (Task 6.4): list tickets, claim, reply, resolve."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.channels import get_senders
from app.security import require_api_key
from app.tickets import Ticket

STATIC_UI = Path(__file__).parent / "static" / "handoff.html"

# The UI page itself is static; every data endpoint below requires the API key.
public = APIRouter(prefix="/handoff", tags=["handoff"])
api = APIRouter(prefix="/handoff", tags=["handoff"], dependencies=[Depends(require_api_key)])


class ClaimIn(BaseModel):
    assignee: str


class ReplyIn(BaseModel):
    text: str
    assignee: str | None = None


def _store(request: Request):
    store = getattr(request.app.state, "tickets", None)
    if store is None:
        raise HTTPException(503, "handoff is not available")
    return store


async def _get(request: Request, ticket_id: str) -> Ticket:
    ticket = await _store(request).get(ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    return ticket


@public.get("/ui", include_in_schema=False)
async def ui():
    return FileResponse(STATIC_UI, media_type="text/html")


@api.get("/tickets")
async def list_tickets(request: Request, status: str | None = None):
    return [t.to_dict() for t in await _store(request).list(status)]


@api.get("/tickets/{ticket_id}")
async def get_ticket(request: Request, ticket_id: str):
    return (await _get(request, ticket_id)).to_dict()


@api.post("/tickets/{ticket_id}/claim")
async def claim(request: Request, ticket_id: str, body: ClaimIn):
    await _get(request, ticket_id)
    ticket = await _store(request).claim(ticket_id, body.assignee)
    if not ticket:
        raise HTTPException(409, "ticket is already resolved")
    return ticket.to_dict()


@api.post("/tickets/{ticket_id}/reply")
async def reply(request: Request, ticket_id: str, body: ReplyIn):
    store = _store(request)
    ticket = await _get(request, ticket_id)
    if ticket.status == "resolved":
        raise HTTPException(409, "ticket is already resolved")
    if ticket.status == "open":
        await store.claim(ticket_id, body.assignee or "human")
    await store.add_message(ticket_id, "human", body.text)
    # keep the bot's context: when the ticket is resolved it knows what the human said
    sessions = getattr(request.app.state, "sessions", None)
    if sessions:
        await sessions.append(ticket.session_id, {"role": "assistant", "content": body.text})

    senders, delivered = get_senders(request.app.state), False
    if ticket.channel == "slack":
        await senders.slack(ticket.session_id, body.text)
        delivered = True
    elif ticket.channel == "whatsapp" and ticket.meta.get("phone_number_id"):
        await senders.whatsapp(ticket.session_id, body.text, ticket.meta["phone_number_id"])
        delivered = True
    return {"delivered": delivered}


@api.post("/tickets/{ticket_id}/resolve")
async def resolve(request: Request, ticket_id: str):
    await _get(request, ticket_id)
    return (await _store(request).resolve(ticket_id)).to_dict()
