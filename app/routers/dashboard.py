"""Operations dashboard routing: serves the real-time web telemetry console."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.dashboard import get_dashboard_html

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard() -> HTMLResponse:
    """Render the built-in real-time dark mode operations and telemetry dashboard."""
    return get_dashboard_html()
