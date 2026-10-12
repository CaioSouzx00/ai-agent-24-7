"""Google tools (Tasks 3.3 and 3.4): Gmail and Google Calendar."""

from __future__ import annotations

import base64
from email.message import EmailMessage
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.tools.base import BaseTool

log = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars"


class GmailTool(BaseTool):
    name = "gmail"
    description = "Read or send emails via Gmail API."
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list_messages", "get_message", "send_message"],
                "description": "Action to perform",
            },
            "query": {
                "type": "string",
                "description": "Search query for list_messages (e.g. 'is:unread', 'from:alice@example.com')",
            },
            "message_id": {
                "type": "string",
                "description": "ID of the message for get_message",
            },
            "to": {
                "type": "string",
                "description": "Recipient email address for send_message",
            },
            "subject": {
                "type": "string",
                "description": "Subject of the email for send_message",
            },
            "body": {
                "type": "string",
                "description": "Plain text content of the email for send_message",
            },
        },
        "required": ["action"],
    }

    def __init__(
        self,
        access_token: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._token = access_token
        self._transport = transport

    async def run(self, **kwargs: Any) -> str:
        token = self._token if self._token is not None else get_settings().google_access_token
        if not token:
            return "error: GOOGLE_ACCESS_TOKEN is not configured"

        action = kwargs.get("action", "list_messages")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0, transport=self._transport) as client:
                if action == "list_messages":
                    q = kwargs.get("query", "")
                    resp = await client.get(
                        f"{GMAIL_API}/messages",
                        headers=headers,
                        params={"q": q, "maxResults": 10},
                    )
                    if not resp.is_success:
                        return f"error: Gmail API returned {resp.status_code}: {resp.text[:200]}"
                    data = resp.json()
                    msgs = data.get("messages", [])
                    if not msgs:
                        return f"No messages found matching '{q}'." if q else "No messages found."
                    return f"Found {len(msgs)} message(s):\n" + "\n".join(
                        f"- ID: {m['id']} (thread: {m.get('threadId', '')})" for m in msgs
                    )

                elif action == "get_message":
                    msg_id = kwargs.get("message_id")
                    if not msg_id:
                        return "error: message_id is required for get_message"
                    resp = await client.get(f"{GMAIL_API}/messages/{msg_id}", headers=headers)
                    if not resp.is_success:
                        return f"error: Gmail API returned {resp.status_code}: {resp.text[:200]}"
                    m = resp.json()
                    snippet = m.get("snippet", "")
                    return f"Message {msg_id}:\nSnippet: {snippet}"

                elif action == "send_message":
                    to = kwargs.get("to")
                    subject = kwargs.get("subject", "(no subject)")
                    body = kwargs.get("body", "")
                    if not to:
                        return "error: 'to' recipient is required for send_message"

                    msg = EmailMessage()
                    msg["To"] = to
                    msg["Subject"] = subject
                    msg.set_content(body)

                    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
                    resp = await client.post(f"{GMAIL_API}/messages/send", headers=headers, json={"raw": raw})
                    if not resp.is_success:
                        return f"error: Gmail API returned {resp.status_code}: {resp.text[:200]}"
                    sent = resp.json()
                    return f"Email sent to {to} (Message ID: {sent.get('id')})"

                else:
                    return f"error: unknown action '{action}'"
        except Exception as exc:
            log.exception("gmail tool failed: %s", exc)
            return f"error: {exc}"


class CalendarTool(BaseTool):
    name = "google_calendar"
    description = "List or create events in Google Calendar."
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list_events", "create_event"],
                "description": "Action to perform",
            },
            "calendar_id": {
                "type": "string",
                "description": "Calendar ID (defaults to 'primary')",
            },
            "summary": {
                "type": "string",
                "description": "Title/summary of the event for create_event",
            },
            "start_time": {
                "type": "string",
                "description": "Start time in ISO format (e.g. '2026-10-15T10:00:00Z')",
            },
            "end_time": {
                "type": "string",
                "description": "End time in ISO format (e.g. '2026-10-15T11:00:00Z')",
            },
            "description": {
                "type": "string",
                "description": "Optional description of the event",
            },
        },
        "required": ["action"],
    }

    def __init__(
        self,
        access_token: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._token = access_token
        self._transport = transport

    async def run(self, **kwargs: Any) -> str:
        token = self._token if self._token is not None else get_settings().google_access_token
        if not token:
            return "error: GOOGLE_ACCESS_TOKEN is not configured"

        action = kwargs.get("action", "list_events")
        cal_id = kwargs.get("calendar_id", "primary")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0, transport=self._transport) as client:
                if action == "list_events":
                    resp = await client.get(
                        f"{CALENDAR_API}/{cal_id}/events",
                        headers=headers,
                        params={"maxResults": 10, "singleEvents": "true", "orderBy": "startTime"},
                    )
                    if not resp.is_success:
                        return f"error: Calendar API returned {resp.status_code}: {resp.text[:200]}"
                    events = resp.json().get("items", [])
                    if not events:
                        return "No upcoming events found."
                    lines = ["Upcoming events:"]
                    for ev in events:
                        start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
                        lines.append(f"- {ev.get('summary', 'Untitled')} ({start})")
                    return "\n".join(lines)

                elif action == "create_event":
                    summary = kwargs.get("summary")
                    start_time = kwargs.get("start_time")
                    end_time = kwargs.get("end_time")
                    if not summary or not start_time or not end_time:
                        return "error: summary, start_time, and end_time are required to create an event"

                    body: dict[str, Any] = {
                        "summary": summary,
                        "start": {"dateTime": start_time},
                        "end": {"dateTime": end_time},
                    }
                    if kwargs.get("description"):
                        body["description"] = kwargs["description"]

                    resp = await client.post(f"{CALENDAR_API}/{cal_id}/events", headers=headers, json=body)
                    if not resp.is_success:
                        return f"error: Calendar API returned {resp.status_code}: {resp.text[:200]}"
                    created = resp.json()
                    return f"Event created: '{created.get('summary')}' at {start_time} (Link: {created.get('htmlLink')})"

                else:
                    return f"error: unknown action '{action}'"
        except Exception as exc:
            log.exception("calendar tool failed: %s", exc)
            return f"error: {exc}"
