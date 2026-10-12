"""Dynamic tool creation and registration at runtime (Task 12)."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.metrics import DYNAMIC_TOOLS
from app.tools.base import BaseTool, registry
from app.tools.web import assert_public_url

log = logging.getLogger(__name__)

# Core tools that cannot be overwritten by dynamically generated tools
PROTECTED_TOOL_NAMES = {
    "web_search",
    "web_browse",
    "playwright_browser",
    "create_tool",
    "github",
    "gmail",
    "calendar",
    "slack",
    "image_analysis",
}

# In-memory index of dynamic tools registered at runtime
_DYNAMIC_REGISTRY: dict[str, DynamicHttpTool] = {}


class DynamicHttpTool(BaseTool):
    """A tool configured at runtime to call an external HTTP API endpoint."""

    def __init__(
        self,
        name: str,
        description: str,
        url: str,
        method: str = "GET",
        parameters: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        check_url: bool = True,
    ) -> None:
        self.name = name
        self.description = description
        self.url = url
        self.method = method.upper()
        self.parameters = parameters or {"type": "object", "properties": {}}
        self.headers = headers or {}
        self._transport = transport
        self._check_url = check_url

    async def run(self, **kwargs: Any) -> str:
        # Validate target URL against SSRF
        if self._check_url:
            try:
                await assert_public_url(self.url)
            except ValueError as err:
                return f"error: security violation - {err}"

        try:
            async with httpx.AsyncClient(
                timeout=15.0, headers=self.headers, transport=self._transport
            ) as client:
                if self.method == "POST":
                    resp = await client.post(self.url, json=kwargs)
                else:
                    resp = await client.get(self.url, params=kwargs)

                if not resp.is_success:
                    return f"error: API returned status {resp.status_code}: {resp.text[:300]}"
                return resp.text[:3000]
        except Exception as exc:  # noqa: BLE001
            log.warning("dynamic tool '%s' request failed", self.name, exc_info=True)
            return f"error: request failed ({exc})"


class CreateToolTool(BaseTool):
    """Tool allowing the agent or system to register new tools dynamically at runtime."""

    name = "create_tool"
    description = (
        "Create and register a new custom tool dynamically at runtime so the agent or system can "
        "use it in future interactions."
    )
    parameters = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Identifier for the new tool (e.g. 'crypto_price')",
            },
            "description": {
                "type": "string",
                "description": "Clear explanation of what the tool does and when to call it",
            },
            "url": {
                "type": "string",
                "description": "Target public HTTP/HTTPS endpoint URL",
            },
            "method": {
                "type": "string",
                "enum": ["GET", "POST"],
                "description": "HTTP method to use (default: GET)",
            },
            "parameters": {
                "type": "object",
                "description": "JSON Schema object defining tool arguments",
            },
            "headers": {
                "type": "object",
                "description": "Optional dictionary of static HTTP headers",
            },
        },
        "required": ["name", "description", "url"],
    }

    def __init__(
        self,
        transport: httpx.AsyncBaseTransport | None = None,
        check_url: bool = True,
    ) -> None:
        self._transport = transport
        self._check_url = check_url

    async def run(self, **kwargs: Any) -> str:
        name = str(kwargs.get("name", "")).strip()
        description = str(kwargs.get("description", "")).strip()
        url = str(kwargs.get("url", "")).strip()
        method = str(kwargs.get("method", "GET")).strip().upper()
        params = kwargs.get("parameters") or {"type": "object", "properties": {}}
        headers = kwargs.get("headers") or {}

        # Validation checks
        if not re.match(r"^[a-zA-Z0-9_-]{3,64}$", name):
            return "error: tool name must be 3-64 characters (alphanumeric, hyphens, underscores)"

        if name in PROTECTED_TOOL_NAMES:
            return f"error: cannot overwrite protected core tool '{name}'"

        if not url.startswith(("http://", "https://")):
            return "error: url must be an absolute http:// or https:// URL"

        if self._check_url:
            try:
                await assert_public_url(url)
            except ValueError as err:
                return f"error: security violation - {err}"

        if not isinstance(params, dict) or params.get("type") != "object":
            return "error: parameters must be a valid JSON Schema object with 'type': 'object'"

        # Instantiate dynamic tool
        tool = DynamicHttpTool(
            name=name,
            description=description,
            url=url,
            method=method,
            parameters=params,
            headers=headers,
            transport=self._transport,
            check_url=self._check_url,
        )

        # Register globally
        registry.register(tool)
        _DYNAMIC_REGISTRY[name] = tool
        DYNAMIC_TOOLS.set(len(_DYNAMIC_REGISTRY))

        return f"Tool '{name}' created and registered successfully! Ready for use."


def list_dynamic_tools() -> list[dict[str, Any]]:
    """Return schema summaries of all registered dynamic tools."""
    return [t.schema() for t in _DYNAMIC_REGISTRY.values()]


def unregister_dynamic_tool(name: str) -> bool:
    """Unregister a dynamic tool by name."""
    if name in _DYNAMIC_REGISTRY:
        _DYNAMIC_REGISTRY.pop(name)
        registry._tools.pop(name, None)
        DYNAMIC_TOOLS.set(len(_DYNAMIC_REGISTRY))
        return True
    return False
