"""Registers tools exposed to the LLM with conditional registration based on credentials."""

from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.tools.base import ToolRegistry, registry
from app.tools.browser import PlaywrightBrowserTool
from app.tools.dynamic import CreateToolTool
from app.tools.github import GitHubTool
from app.tools.google import CalendarTool, GmailTool
from app.tools.slack import SlackTool
from app.tools.vision import ImageAnalysisTool
from app.tools.web import WebBrowseTool, WebSearchTool

log = logging.getLogger(__name__)


def register_default_tools(
    target_registry: ToolRegistry | None = None,
    settings: Settings | None = None,
) -> list[str]:
    """Register core tools and conditionally register credential-dependent tools."""
    reg = target_registry if target_registry is not None else registry
    cfg = settings if settings is not None else get_settings()

    # Core tools that do not require external credentials
    core_tools = [
        WebBrowseTool(),
        WebSearchTool(),
        PlaywrightBrowserTool(),
        CreateToolTool(),
        SlackTool(),
    ]
    for tool in core_tools:
        reg.register(tool)

    registered: list[str] = [t.name for t in core_tools]

    # Conditional tool: GitHub (requires GITHUB_TOKEN)
    if bool(cfg.github_token):
        reg.register(GitHubTool())
        registered.append("github")
    else:
        log.debug("GitHub tool omitted: GITHUB_TOKEN is not configured")

    # Conditional tools: Gmail and Google Calendar (requires Google credentials)
    has_google_creds = bool(
        cfg.google_access_token
        or cfg.google_service_account_file
        or cfg.google_oauth_credentials_file
    )
    if has_google_creds:
        reg.register(GmailTool())
        reg.register(CalendarTool())
        registered.extend(["gmail", "google_calendar"])
    else:
        log.debug("Gmail & Calendar tools omitted: Google credentials not configured")

    # Conditional tool: Vision (requires vision_model or cloud NIM API key)
    has_vision_creds = bool(
        cfg.vision_model or (cfg.nim_api_key and cfg.nim_api_key != "not-needed-locally")
    )
    if has_vision_creds:
        reg.register(ImageAnalysisTool())
        registered.append("image_analysis")
    else:
        log.debug("Vision tool omitted: Vision model or NIM API key not configured")

    return registered


# Execute registration on module import
register_default_tools(registry)
