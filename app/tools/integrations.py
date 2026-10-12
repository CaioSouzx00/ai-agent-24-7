"""Integration tools (Tasks 3.2–3.7) — skeletons to be implemented."""

from __future__ import annotations

from typing import Any

from app.tools.base import BaseTool, registry


class _Stub(BaseTool):
    async def run(self, **kwargs: Any) -> str:
        raise NotImplementedError(f"Tool '{self.name}' is not implemented yet")


class WebBrowseTool(_Stub):  # Task 3.2 (Playwright)
    name = "web_browse"
    description = "Browse a URL and return the page text."
    parameters = {
        "type": "object",
        "properties": {"url": {"type": "string"}},
        "required": ["url"],
    }


class GmailTool(_Stub):  # Task 3.3
    name = "gmail"
    description = "Read or send emails via Gmail (OAuth)."


class CalendarTool(_Stub):  # Task 3.4
    name = "google_calendar"
    description = "List or create events in Google Calendar."


class SlackTool(_Stub):  # Task 3.5
    name = "slack"
    description = "Send messages on Slack."


class GitHubTool(_Stub):  # Task 3.6
    name = "github"
    description = "Query issues/PRs and create issues on GitHub."


class ImageAnalysisTool(_Stub):  # Task 3.7
    name = "image_analysis"
    description = "Analyze an image with a multimodal LLM."


for _t in (
    WebBrowseTool(),
    GmailTool(),
    CalendarTool(),
    SlackTool(),
    GitHubTool(),
    ImageAnalysisTool(),
):
    registry.register(_t)
