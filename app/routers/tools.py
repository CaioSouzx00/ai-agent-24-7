"""Tools routing: documentation and runtime dynamic tools management."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.security import require_api_key
from app.tools.base import registry
from app.tools.dynamic import list_dynamic_tools, unregister_dynamic_tool

router = APIRouter(tags=["tools"])


class CreateDynamicToolIn(BaseModel):
    name: str
    description: str
    url: str
    method: str = "GET"
    parameters: dict[str, Any] | None = None
    headers: dict[str, str] | None = None


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
