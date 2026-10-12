"""Unit tests for GmailTool and CalendarTool (Task 4)."""

import httpx

from app.tools.google import CalendarTool, GmailTool

# ---- Gmail Tests ----


async def test_gmail_missing_token():
    tool = GmailTool(access_token="")
    res = await tool.run(action="list_messages")
    assert "error: GOOGLE_ACCESS_TOKEN is not configured" in res


async def test_gmail_list_messages():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/gmail/v1/users/me/messages"
        assert "Bearer mock-token" in request.headers["Authorization"]
        return httpx.Response(
            200,
            json={
                "messages": [
                    {"id": "msg_001", "threadId": "t_001"},
                    {"id": "msg_002", "threadId": "t_002"},
                ]
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GmailTool(access_token="mock-token", transport=transport)
    result = await tool.run(action="list_messages", query="is:unread")
    assert "Found 2 message(s)" in result
    assert "msg_001" in result


async def test_gmail_get_message():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/gmail/v1/users/me/messages/msg_123"
        return httpx.Response(
            200,
            json={"id": "msg_123", "snippet": "Hey, your report is ready!"},
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GmailTool(access_token="mock-token", transport=transport)
    result = await tool.run(action="get_message", message_id="msg_123")
    assert "Message msg_123" in result
    assert "Hey, your report is ready!" in result


async def test_gmail_send_message():
    def mock_handler(request: httpx.Request):
        assert request.method == "POST"
        assert request.url.path == "/gmail/v1/users/me/messages/send"
        return httpx.Response(
            200,
            json={"id": "sent_999"},
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GmailTool(access_token="mock-token", transport=transport)
    result = await tool.run(
        action="send_message",
        to="alice@example.com",
        subject="Meeting",
        body="Let's meet tomorrow.",
    )
    assert "Email sent to alice@example.com (Message ID: sent_999)" in result


# ---- Calendar Tests ----


async def test_calendar_missing_token():
    tool = CalendarTool(access_token="")
    res = await tool.run(action="list_events")
    assert "error: GOOGLE_ACCESS_TOKEN is not configured" in res


async def test_calendar_list_events():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/calendar/v3/calendars/primary/events"
        return httpx.Response(
            200,
            json={
                "items": [
                    {"summary": "Sprint Planning", "start": {"dateTime": "2026-10-15T09:00:00Z"}},
                    {"summary": "1:1 with Manager", "start": {"dateTime": "2026-10-15T14:00:00Z"}},
                ]
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = CalendarTool(access_token="mock-token", transport=transport)
    result = await tool.run(action="list_events")
    assert "Upcoming events:" in result
    assert "Sprint Planning" in result
    assert "1:1 with Manager" in result


async def test_calendar_create_event():
    def mock_handler(request: httpx.Request):
        assert request.method == "POST"
        assert request.url.path == "/calendar/v3/calendars/primary/events"
        return httpx.Response(
            200,
            json={
                "summary": "Team Demo",
                "htmlLink": "https://calendar.google.com/event?eid=123",
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = CalendarTool(access_token="mock-token", transport=transport)
    result = await tool.run(
        action="create_event",
        summary="Team Demo",
        start_time="2026-10-16T15:00:00Z",
        end_time="2026-10-16T16:00:00Z",
    )
    assert "Event created: 'Team Demo'" in result
    assert "https://calendar.google.com/event?eid=123" in result
