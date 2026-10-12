"""Unit tests for runtime dynamic tool creation and execution (Task 12)."""

import json

import httpx
import pytest

from app.tools.base import registry
from app.tools.dynamic import (
    CreateToolTool,
    DynamicHttpTool,
    list_dynamic_tools,
    unregister_dynamic_tool,
)


@pytest.mark.asyncio
async def test_create_tool_and_execute_get():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/v1/bpi/currentprice.json"
        return httpx.Response(200, json={"bpi": {"USD": {"rate": "65000.00"}}})

    transport = httpx.MockTransport(mock_handler)
    create_tool = CreateToolTool(transport=transport, check_url=False)

    # 1. Create the dynamic tool
    result = await create_tool.run(
        name="crypto_price_test",
        description="Fetch current Bitcoin price in USD",
        url="https://api.coindesk.com/v1/bpi/currentprice.json",
        method="GET",
        parameters={
            "type": "object",
            "properties": {"currency": {"type": "string"}},
        },
    )
    assert "created and registered successfully" in result

    # 2. Check it appears in the global registry
    tool = registry.get("crypto_price_test")
    assert tool is not None
    assert isinstance(tool, DynamicHttpTool)
    assert tool.description == "Fetch current Bitcoin price in USD"

    # 3. Execute the tool
    data_str = await tool.run(currency="USD")
    data = json.loads(data_str)
    assert data["bpi"]["USD"]["rate"] == "65000.00"

    # 4. Clean up
    assert unregister_dynamic_tool("crypto_price_test") is True
    assert registry.get("crypto_price_test") is None


@pytest.mark.asyncio
async def test_create_tool_rejects_protected_name():
    create_tool = CreateToolTool()
    result = await create_tool.run(
        name="web_search",
        description="Try to overwrite core tool",
        url="https://api.example.com",
    )
    assert "error: cannot overwrite protected core tool" in result


@pytest.mark.asyncio
async def test_create_tool_rejects_invalid_name():
    create_tool = CreateToolTool()
    result = await create_tool.run(
        name="invalid tool with spaces!",
        description="Bad name",
        url="https://api.example.com",
    )
    assert "error: tool name must be 3-64 characters" in result


@pytest.mark.asyncio
async def test_create_tool_rejects_private_ssrf():
    create_tool = CreateToolTool()
    result = await create_tool.run(
        name="internal_exploit",
        description="Try SSRF attack",
        url="http://127.0.0.1:8000/admin",
    )
    assert "security violation" in result
    assert registry.get("internal_exploit") is None


@pytest.mark.asyncio
async def test_list_dynamic_tools():
    create_tool = CreateToolTool(check_url=False)
    await create_tool.run(
        name="custom_math_tool",
        description="Calculate math",
        url="https://api.mathjs.org/v4/",
    )
    tools = list_dynamic_tools()
    names = [t["function"]["name"] for t in tools]
    assert "custom_math_tool" in names

    # Clean up
    unregister_dynamic_tool("custom_math_tool")
