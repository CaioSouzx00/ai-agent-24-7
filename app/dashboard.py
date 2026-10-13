"""Built-in modern metrics and operations dashboard (Task 11).

Serves the compiled React SPA bundle (web/dist/index.html) if present,
with fallback to app/templates/dashboard.html for backwards compatibility.
"""

from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse

_DIST_INDEX = Path(__file__).resolve().parent.parent / "web" / "dist" / "index.html"
_LEGACY_TEMPLATE = Path(__file__).resolve().parent / "templates" / "dashboard.html"
_CACHED_HTML: str | None = None


def _get_template() -> str:
    global _CACHED_HTML
    if _CACHED_HTML is not None:
        return _CACHED_HTML

    if _DIST_INDEX.exists():
        _CACHED_HTML = _DIST_INDEX.read_text(encoding="utf-8")
        return _CACHED_HTML

    if _LEGACY_TEMPLATE.exists():
        _CACHED_HTML = _LEGACY_TEMPLATE.read_text(encoding="utf-8")
        return _CACHED_HTML
    return (
        "<html><body>"
        "<h1>AI Agent 24/7 Operations</h1>"
        "<p>Prometheus Metrics Snapshot</p>"
        "</body></html>"
    )


def get_dashboard_html() -> HTMLResponse:
    """Return a single-page, real-time dark mode operations dashboard."""
    return HTMLResponse(content=_get_template(), status_code=200)
