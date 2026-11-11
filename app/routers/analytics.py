"""Agent Behavior analytics API: dense, cacheable aggregates for the /analytics cockpit.

All endpoints read from the in-process sliding-window store (``app.analytics.ANALYTICS``),
so they work without a Prometheus server and never run PromQL on the request path.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field

from app.analytics import ANALYTICS, PERIODS
from app.config import get_settings
from app.dashboard import get_dashboard_html
from app.security import require_api_key

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_api_key)],
)
# SPA entry point for the React page (static HTML; data endpoints above are protected)
spa = APIRouter(tags=["analytics"])

Period = Literal["1h", "6h", "24h", "7d", "30d"]
Step = Literal["1m", "5m", "15m", "1h", "6h", "1d"]
CACHE_HEADER = "private, max-age=5"


# ---------------------------------------------------------------------------
# schemas
# ---------------------------------------------------------------------------
class Latency(BaseModel):
    avg: float | None = None
    p50: float | None = None
    p95: float | None = None
    p99: float | None = None
    max: float | None = None


class Point(BaseModel):
    ts: float
    value: float | None = None
    labels: dict[str, str] | None = None


class ToolStats(BaseModel):
    tool: str
    calls: int
    errors: int
    error_rate: float
    latency: Latency
    error_types: dict[str, int]
    channels: dict[str, int]
    last_called_at: float
    last_error_at: float | None = None


class ToolExecution(BaseModel):
    ts: float
    duration: float
    success: bool
    error_type: str | None = None
    channel: str
    tenant_id: str
    session_id: str


class ToolSeriesPoint(BaseModel):
    ts: float
    calls: int
    errors: int
    p95: float | None = None


class ToolDetail(ToolStats):
    series: list[ToolSeriesPoint]
    step_seconds: int
    recent: list[ToolExecution]


class ToolsResponse(BaseModel):
    period: str
    total_calls: int
    errors: int
    error_rate: float | None = None
    tools: list[ToolStats]


class Window(BaseModel):
    start: float
    end: float
    step_seconds: int


class PreviousPeriod(BaseModel):
    volume: int
    conversations: int
    autonomous_rate: float | None = None
    handoff_rate: float | None = None
    error_rate: float | None = None
    latency_p95: float | None = None
    rate_limited: int


class ToolsBlock(BaseModel):
    total_calls: int
    errors: int
    error_rate: float | None = None
    top: list[ToolStats]


class HandoffsBlock(BaseModel):
    total: int
    by_reason: dict[str, int]
    by_channel: dict[str, int]
    avg_wait_seconds: float | None = None
    p95_wait_seconds: float | None = None
    avg_resolution_seconds: float | None = None
    claimed: int
    resolved: int


class LLMModelStats(BaseModel):
    calls: int
    errors: int
    p95: float | None = None
    prompt_tokens: int
    completion_tokens: int


class LLMBlock(BaseModel):
    calls: int
    errors: int
    latency: Latency
    tokens: dict[str, int]
    by_model: dict[str, LLMModelStats]


class SampleStats(BaseModel):
    count: int
    avg: float | None = None
    p95: float | None = None
    hit_rate: float | None = None


class HealthBlock(BaseModel):
    fallback_events: dict[str, int]
    degraded_components: list[str]
    ssrf_blocked: int
    signature_failures: dict[str, int]
    rate_limited_by_identifier: dict[str, int]
    rate_limited_total: int
    memory: dict[str, SampleStats]
    graph_nodes: dict[str, SampleStats]


class SparkPoint(BaseModel):
    ts: float
    value: float | None = None


class Dimensions(BaseModel):
    channels: list[str]
    tenants: list[str]


class SummaryResponse(BaseModel):
    period: str
    window: Window
    filters: dict[str, str | None]
    generated_at: float
    volume: int = Field(description="All turns in the window, incl. rate-limited/human-active")
    agent_turns: int = Field(description="Turns the agent handled (autonomous+handoff+error)")
    conversations: int
    outcomes: dict[str, int]
    autonomous_rate: float | None = Field(None, description="autonomous_resolved / agent_turns")
    handoff_rate: float | None = None
    error_rate: float | None = None
    rate_limited: int
    latency: Latency
    tool_calls: int
    avg_tools_per_turn: float | None = None
    llm_calls: int
    tokens: dict[str, int]
    active_sessions: int
    previous: PreviousPeriod
    tools: ToolsBlock
    handoffs: HandoffsBlock
    llm: LLMBlock
    health: HealthBlock
    sparklines: dict[str, list[SparkPoint]]
    dimensions: Dimensions


class TimeseriesResponse(BaseModel):
    metric: str
    period: str
    step_seconds: int
    start: float
    end: float
    group_by: str | None = None
    points: list[Point]


class ConversationRow(BaseModel):
    id: str
    session_id: str
    tenant_id: str
    channel: str
    started_at: float
    last_at: float
    turns: int
    duration_seconds: float
    tool_calls: int
    tools_used: list[str]
    outcome: str
    handoff_reason: str | None = None
    active: bool


class DistBucket(BaseModel):
    bucket: str
    count: int


class ConversationsResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[ConversationRow]
    tools_per_conversation: list[DistBucket]


class TicketRow(BaseModel):
    id: str
    session_id: str
    channel: str
    tenant_id: str
    status: str
    assignee: str | None = None
    reason: str
    reason_text: str
    created_at: float
    claimed_at: float | None = None
    resolved_at: float | None = None
    wait_seconds: float | None = None
    resolution_seconds: float | None = None
    messages: int


class TicketsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    oldest_open_wait_seconds: float | None = None
    items: list[TicketRow]


# ---------------------------------------------------------------------------
# endpoints
# ---------------------------------------------------------------------------
def _f(v: str | None) -> str | None:
    """Normalise empty/'all' filters to None."""
    return None if v in (None, "", "all") else v


@router.get("/summary", response_model=SummaryResponse)
async def summary(
    request: Request,
    response: Response,
    period: Period = "24h",
    channel: str | None = None,
    tenant_id: str | None = None,
    from_ts: float | None = Query(None, alias="from"),
    to_ts: float | None = Query(None, alias="to"),
) -> dict[str, Any]:
    """KPI strip + every aggregate panel in one call (cached ~5s)."""
    await ANALYTICS.refresh_ticket_gauges(getattr(request.app.state, "tickets", None))
    response.headers["Cache-Control"] = CACHE_HEADER
    return ANALYTICS.summary(period, _f(channel), _f(tenant_id), from_ts, to_ts)


@router.get("/timeseries", response_model=TimeseriesResponse)
async def timeseries(
    response: Response,
    metric: str = Query(..., description=", ".join(ANALYTICS.TIMESERIES_METRICS)),
    period: Period = "24h",
    step: Step | None = None,
    channel: str | None = None,
    tenant_id: str | None = None,
    group_by: str | None = Query(None, description="channel | reason | outcome | tool | ..."),
    from_ts: float | None = Query(None, alias="from"),
    to_ts: float | None = Query(None, alias="to"),
) -> dict[str, Any]:
    try:
        data = ANALYTICS.timeseries(
            metric, period, step, _f(channel), _f(tenant_id), _f(group_by), from_ts, to_ts
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    response.headers["Cache-Control"] = CACHE_HEADER
    return data


@router.get("/conversations", response_model=ConversationsResponse)
async def conversations(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None, description="autonomous_resolved | handoff | error | active"),
    channel: str | None = None,
    tenant_id: str | None = None,
    from_ts: float | None = Query(None, alias="from"),
    to_ts: float | None = Query(None, alias="to"),
) -> dict[str, Any]:
    return ANALYTICS.conversations(
        limit, offset, _f(status), _f(channel), _f(tenant_id), from_ts, to_ts
    )


@router.get("/tools", response_model=ToolsResponse)
async def tools(
    period: Period = "24h",
    channel: str | None = None,
    tenant_id: str | None = None,
    from_ts: float | None = Query(None, alias="from"),
    to_ts: float | None = Query(None, alias="to"),
) -> dict[str, Any]:
    return ANALYTICS.tools(period, _f(channel), _f(tenant_id), from_ts, to_ts)


@router.get("/tools/{tool_name}", response_model=ToolDetail)
async def tool_detail(
    tool_name: str,
    period: Period = "24h",
    channel: str | None = None,
    tenant_id: str | None = None,
    from_ts: float | None = Query(None, alias="from"),
    to_ts: float | None = Query(None, alias="to"),
) -> dict[str, Any]:
    data = ANALYTICS.tool_detail(tool_name, period, _f(channel), _f(tenant_id), from_ts, to_ts)
    if data is None:
        raise HTTPException(404, "no executions for this tool in the selected window")
    return data


@router.get("/tickets", response_model=TicketsResponse)
async def tickets(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    status: str | None = None,
    channel: str | None = None,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    store = getattr(request.app.state, "tickets", None)
    return await ANALYTICS.tickets(store, limit, _f(status), _f(channel), _f(tenant_id))


@router.get("/meta")
async def meta() -> dict[str, Any]:
    """Static descriptors for the UI (supported periods, metrics, group-bys)."""
    return {
        "periods": list(PERIODS),
        "metrics": list(ANALYTICS.TIMESERIES_METRICS),
        "group_by": {k: list(v) for k, v in ANALYTICS.GROUPABLE.items()},
    }


@router.post("/_seed", include_in_schema=False)
async def seed(hours: int = Query(24, ge=1, le=24 * 30), per_hour: int = Query(40, ge=1, le=500)):
    """DEV/TEST ONLY: inject synthetic traffic to validate the UI without an LLM."""
    if get_settings().app_env not in ("dev", "test"):
        raise HTTPException(404)
    return {"seeded_turns": ANALYTICS.seed_demo(hours=hours, turns_per_hour=per_hour)}


@spa.get("/analytics", include_in_schema=False)
async def analytics_page():
    return get_dashboard_html()
