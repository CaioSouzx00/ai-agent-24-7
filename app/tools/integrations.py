"""Registers the tools exposed to the LLM."""

from __future__ import annotations

from app.tools.base import registry
from app.tools.browser import PlaywrightBrowserTool
from app.tools.github import GitHubTool
from app.tools.google import CalendarTool, GmailTool
from app.tools.slack import SlackTool
from app.tools.vision import ImageAnalysisTool
from app.tools.web import WebBrowseTool, WebSearchTool

# Register all implemented tools
for _t in (
    WebBrowseTool(),
    WebSearchTool(),
    PlaywrightBrowserTool(),
    SlackTool(),
    GitHubTool(),
    GmailTool(),
    CalendarTool(),
    ImageAnalysisTool(),
):
    registry.register(_t)
