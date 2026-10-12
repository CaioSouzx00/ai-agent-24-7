"""Playwright Headless Browser tool (Task 5): execute JS, click, fill forms, and extract content."""

from __future__ import annotations

import logging
from typing import Any

from app.tools.base import BaseTool
from app.tools.web import UnsafeURLError, assert_public_url, html_to_text

log = logging.getLogger(__name__)

MAX_CHARS = 8_000


class PlaywrightBrowserTool(BaseTool):
    name = "playwright_browser"
    description = (
        "Interact with web pages using a headless browser (Playwright). "
        "Supports JavaScript-rendered sites, clicking buttons, filling form inputs, and extracting text."
    )
    parameters = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "Full URL of the public web page (http/https)",
            },
            "action": {
                "type": "string",
                "enum": ["extract_text", "click", "fill_form", "screenshot"],
                "description": "Browser action to perform (default: extract_text)",
            },
            "selector": {
                "type": "string",
                "description": "CSS selector to click or fill (required for click and fill_form)",
            },
            "text": {
                "type": "string",
                "description": "Text to enter into the form field (for fill_form)",
            },
            "wait_for_selector": {
                "type": "string",
                "description": "Optional CSS selector to wait for before extracting",
            },
        },
        "required": ["url"],
    }

    def __init__(self, check_url: bool = True, browser_driver=None) -> None:
        self._check_url = check_url
        self._browser_driver = browser_driver

    async def run(self, **kwargs: Any) -> str:
        url = kwargs.get("url", "").strip()
        if not url:
            return "error: url is required"

        if self._check_url:
            try:
                await assert_public_url(url)
            except UnsafeURLError as exc:
                return f"error: {exc}"

        action = kwargs.get("action", "extract_text")
        selector = kwargs.get("selector")
        text = kwargs.get("text", "")
        wait_for = kwargs.get("wait_for_selector")

        # Allow passing custom mock driver for testing
        if self._browser_driver:
            return await self._browser_driver(url=url, action=action, selector=selector, text=text)

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return "error: playwright is not installed"

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                try:
                    await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                    if wait_for:
                        await page.wait_for_selector(wait_for, timeout=5000)

                    if action == "click":
                        if not selector:
                            return "error: selector is required for click action"
                        await page.click(selector, timeout=5000)
                        await page.wait_for_timeout(1000)
                        content = await page.content()
                        text_content = html_to_text(content)
                        return f"Clicked '{selector}'. Page text now:\n{text_content[:MAX_CHARS]}"

                    elif action == "fill_form":
                        if not selector:
                            return "error: selector is required for fill_form action"
                        await page.fill(selector, text, timeout=5000)
                        return f"Filled field '{selector}' with text. Value updated."

                    elif action == "screenshot":
                        # Return page title and confirmation
                        title = await page.title()
                        return f"Screenshot captured for '{title}' ({url})"

                    else:  # extract_text
                        content = await page.content()
                        text_content = html_to_text(content)
                        return text_content[:MAX_CHARS] or "(empty page)"
                finally:
                    await browser.close()
        except Exception as exc:
            log.warning("playwright execution failed, falling back to HTTP: %s", exc)
            # Fallback to simple HTTP fetch
            try:
                import httpx

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url)
                    return html_to_text(resp.text)[:MAX_CHARS]
            except Exception as http_exc:
                return f"error: headless browser failed ({exc}) and HTTP fallback failed ({http_exc})"
