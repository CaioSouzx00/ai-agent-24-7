"""Tools routing: documentation and runtime dynamic tools management."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

from app.security import require_api_key
from app.tools.base import registry
from app.tools.dynamic import list_dynamic_tools, unregister_dynamic_tool

router = APIRouter(tags=["tools"])


class CreateDynamicToolIn(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "currency_rates",
                    "description": "Fetch real-time foreign exchange currency rates",
                    "url": "https://api.frankfurter.app/latest",
                    "method": "GET",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "from": {"type": "string", "description": "Base currency"},
                            "to": {"type": "string", "description": "Quote currency"},
                        },
                    },
                }
            ]
        }
    )

    name: str = Field(..., description="Unique snake_case identifier for the dynamic tool")
    description: str = Field(..., description="Actionable description of tool functionality")
    url: str = Field(..., description="Target public HTTPS endpoint")
    method: str = Field(default="GET", description="HTTP method (GET, POST, PUT, DELETE)")
    parameters: dict[str, Any] | None = Field(
        default=None, description="JSON Schema object describing required parameters"
    )
    headers: dict[str, str] | None = Field(
        default=None, description="Static HTTP headers to send with the request"
    )


@router.get("/tools")
async def tools_docs() -> PlainTextResponse:
    """Return markdown documentation of all currently active tools in registry."""
    return PlainTextResponse(registry.docs())


@router.get("/tools/dynamic", dependencies=[Depends(require_api_key)])
async def get_dynamic_tools() -> list[dict[str, Any]]:
    """List all dynamic tools created at runtime."""
    return list_dynamic_tools()


@router.post("/tools/dynamic", dependencies=[Depends(require_api_key)])
async def create_dynamic_tool_endpoint(body: CreateDynamicToolIn) -> dict[str, str]:
    """Register a new HTTP tool dynamically at runtime."""
    tool = registry.get("create_tool")
    if not tool:
        raise HTTPException(500, "create_tool not found in registry")
    result = await tool.run(
        name=body.name,
        description=body.description,
        url=body.url,
        method=body.method,
        parameters=body.parameters,
        headers=body.headers,
    )
    if result.startswith("error:"):
        raise HTTPException(400, result)
    return {"message": result, "tool": body.name}


@router.delete("/tools/dynamic/{name}", dependencies=[Depends(require_api_key)])
async def delete_dynamic_tool_endpoint(name: str) -> dict[str, bool]:
    """Unregister and remove a dynamic tool by name."""
    if not unregister_dynamic_tool(name):
        raise HTTPException(404, f"Dynamic tool '{name}' not found")
    return {"ok": True}
