"""Unit tests for conditional tool registration based on credentials."""

from app.config import Settings
from app.tools.base import ToolRegistry
from app.tools.integrations import register_default_tools


def test_core_tools_always_registered():
    reg = ToolRegistry()
    cfg = Settings(
        github_token="",
        google_access_token="",
        vision_model="",
        nim_api_key="not-needed-locally",
    )
    registered = register_default_tools(reg, cfg)

    assert "web_browse" in registered
    assert "web_search" in registered
    assert "playwright_browser" in registered
    assert "create_tool" in registered
    assert "slack_send_message" in registered

    # Credentials not present, so these must NOT be registered
    assert "github" not in registered
    assert "gmail" not in registered
    assert "google_calendar" not in registered
    assert "image_analysis" not in registered
    assert reg.get("github") is None
    assert reg.get("gmail") is None


def test_tools_registered_when_credentials_present():
    reg = ToolRegistry()
    cfg = Settings(
        github_token="ghp_test_token",
        google_access_token="ya29.test_token",
        vision_model="meta/llama-3.2-11b-vision-instruct",
        nim_api_key="nvapi-test-key",
    )
    registered = register_default_tools(reg, cfg)

    assert "github" in registered
    assert "gmail" in registered
    assert "google_calendar" in registered
    assert "image_analysis" in registered

    assert reg.get("github") is not None
    assert reg.get("gmail") is not None
    assert reg.get("google_calendar") is not None
    assert reg.get("image_analysis") is not None
