"""Registers the tools exposed to the LLM.

Only implemented tools are registered. The stubs below (Tasks 3.3, 3.4, 3.6, 3.7) are NOT
advertised to the model until they are implemented.
"""

from __future__ import annotations

from typing import Any

from app.tools.base import BaseTool, registry
from app.tools.slack import SlackTool
from app.tools.web import WebBrowseTool, WebSearchTool


class _Stub(BaseTool):
    async def run(self, **kwargs: Any) -> str:
        raise NotImplementedError(f"Tool '{self.name}' is not implemented yet")


class GmailTool(_Stub):  # Task 3.3
    name = "gmail"
    description = "Read or send emails via Gmail (OAuth)."


class CalendarTool(_Stub):  # Task 3.4
    name = "google_calendar"
    description = "List or create events in Google Calendar."


class GitHubTool(_Stub):  # Task 3.6
    name = "github"
    description = "Query issues/PRs and create issues on GitHub."


class ImageAnalysisTool(_Stub):  # Task 3.7
    name = "image_analysis"
    description = "Analyze an image with a multimodal LLM."


for _t in (WebBrowseTool(), WebSearchTool(), SlackTool()):
    registry.register(_t)
