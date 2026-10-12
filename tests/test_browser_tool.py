"""Unit tests for PlaywrightBrowserTool (Task 5)."""

import pytest

from app.tools.browser import PlaywrightBrowserTool


async def test_browser_tool_requires_url():
    tool = PlaywrightBrowserTool(check_url=False)
    res = await tool.run(url="")
    assert "error: url is required" in res


async def test_browser_tool_blocks_ssrf():
    tool = PlaywrightBrowserTool(check_url=True)
    res = await tool.run(url="http://127.0.0.1:8080/admin")
    assert "error" in res and "non-public" in res


async def test_browser_tool_mock_driver_extract():
    async def mock_driver(url, action, selector=None, text=""):
        return f"Mocked extraction for {url} with action {action}"

    tool = PlaywrightBrowserTool(check_url=False, browser_driver=mock_driver)
    res = await tool.run(url="https://example.com", action="extract_text")
    assert "Mocked extraction for https://example.com with action extract_text" in res


async def test_browser_tool_mock_driver_click():
    async def mock_driver(url, action, selector=None, text=""):
        return f"Clicked selector '{selector}' on {url}"

    tool = PlaywrightBrowserTool(check_url=False, browser_driver=mock_driver)
    res = await tool.run(url="https://example.com", action="click", selector="#submit-btn")
    assert "Clicked selector '#submit-btn' on https://example.com" in res
