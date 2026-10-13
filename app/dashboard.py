"""Built-in modern metrics and operations dashboard (Task 11).

Loads HTML, styling, and client-side logic from app/templates/dashboard.html.
"""

from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse

_TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "dashboard.html"
_CACHED_HTML: str | None = None


def _get_template() -> str:
    global _CACHED_HTML
    if _CACHED_HTML is None:
        _CACHED_HTML = _TEMPLATE_PATH.read_text(encoding="utf-8")
    return _CACHED_HTML


def get_dashboard_html() -> HTMLResponse:
    """Return a single-page, real-time dark mode operations dashboard."""
    return HTMLResponse(content=_get_template(), status_code=200)
