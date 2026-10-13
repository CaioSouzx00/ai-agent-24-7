"""Operations dashboard routing: serves real-time web telemetry and business analytics."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.dashboard import get_dashboard_html
from app.metrics import BUSINESS_TRACKER

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard() -> HTMLResponse:
    """Render the built-in real-time dark mode operations and telemetry dashboard."""
    return get_dashboard_html()


@router.get("/metrics/business")
async def business_metrics() -> dict[str, Any]:
    """Retrieve operational business telemetry: handoffs/day, top tools, and latencies."""
    return BUSINESS_TRACKER.get_summary()
