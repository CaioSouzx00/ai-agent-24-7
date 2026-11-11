/** Contracts for /api/analytics/* (mirrors app/routers/analytics.py Pydantic schemas). */

export type Period = '1h' | '6h' | '24h' | '7d' | '30d'
export type Outcome = 'autonomous_resolved' | 'handoff' | 'error' | 'rate_limited' | 'human_active'
export type HandoffReason =
  | 'human_requested'
  | 'frustration'
  | 'cancel'
  | 'complex'
  | 'low_confidence'
  | 'other'

export interface Latency {
  avg: number | null
  p50: number | null
  p95: number | null
  p99?: number | null
  max?: number | null
}

export interface SparkPoint {
  ts: number
  value: number | null
}

export interface ToolStats {
  tool: string
  calls: number
  errors: number
  error_rate: number
  latency: Latency
  error_types: Record<string, number>
  channels: Record<string, number>
  last_called_at: number
  last_error_at: number | null
}

export interface ToolExecution {
  ts: number
  duration: number
  success: boolean
  error_type: string | null
  channel: string
  tenant_id: string
  session_id: string
}

export interface ToolDetail extends ToolStats {
  series: { ts: number; calls: number; errors: number; p95: number | null }[]
  step_seconds: number
  recent: ToolExecution[]
}

export interface SampleStats {
  count: number
  avg: number | null
  p95: number | null
  hit_rate: number | null
}

export interface AnalyticsSummary {
  period: string
  window: { start: number; end: number; step_seconds: number }
  filters: Record<string, string | null>
  generated_at: number
  volume: number
  agent_turns: number
  conversations: number
  outcomes: Record<Outcome, number>
  autonomous_rate: number | null
  handoff_rate: number | null
  error_rate: number | null
  rate_limited: number
  latency: Latency
  tool_calls: number
  avg_tools_per_turn: number | null
  llm_calls: number
  tokens: { prompt: number; completion: number }
  active_sessions: number
  previous: {
    volume: number
    conversations: number
    autonomous_rate: number | null
    handoff_rate: number | null
    error_rate: number | null
    latency_p95: number | null
    rate_limited: number
  }
  tools: { total_calls: number; errors: number; error_rate: number | null; top: ToolStats[] }
  handoffs: {
    total: number
    by_reason: Record<string, number>
    by_channel: Record<string, number>
    avg_wait_seconds: number | null
    p95_wait_seconds: number | null
    avg_resolution_seconds: number | null
    claimed: number
    resolved: number
  }
  llm: {
    calls: number
    errors: number
    latency: Latency
    tokens: { prompt: number; completion: number }
    by_model: Record<
      string,
      { calls: number; errors: number; p95: number | null; prompt_tokens: number; completion_tokens: number }
    >
  }
  health: {
    fallback_events: Record<string, number>
    degraded_components: string[]
    ssrf_blocked: number
    signature_failures: Record<string, number>
    rate_limited_by_identifier: Record<string, number>
    rate_limited_total: number
    memory: Record<string, SampleStats>
    graph_nodes: Record<string, SampleStats>
  }
  sparklines: Record<
    'requests' | 'autonomous_rate' | 'handoff_rate' | 'latency_p95' | 'tool_error_rate' | 'rate_limited',
    SparkPoint[]
  >
  dimensions: { channels: string[]; tenants: string[] }
}

export interface TimeseriesPoint {
  ts: number
  value: number | null
  labels?: Record<string, string>
}

export interface TimeseriesResponse {
  metric: string
  period: string
  step_seconds: number
  start: number
  end: number
  group_by: string | null
  points: TimeseriesPoint[]
}

export interface ConversationRow {
  id: string
  session_id: string
  tenant_id: string
  channel: string
  started_at: number
  last_at: number
  turns: number
  duration_seconds: number
  tool_calls: number
  tools_used: string[]
  outcome: Outcome
  handoff_reason: string | null
  active: boolean
}

export interface ConversationsResponse {
  total: number
  limit: number
  offset: number
  items: ConversationRow[]
  tools_per_conversation: { bucket: string; count: number }[]
}

export interface ToolsResponse {
  period: string
  total_calls: number
  errors: number
  error_rate: number | null
  tools: ToolStats[]
}

export interface TicketRow {
  id: string
  session_id: string
  channel: string
  tenant_id: string
  status: 'open' | 'claimed' | 'resolved'
  assignee: string | null
  reason: string
  reason_text: string
  created_at: number
  claimed_at: number | null
  resolved_at: number | null
  wait_seconds: number | null
  resolution_seconds: number | null
  messages: number
}

export interface TicketsResponse {
  total: number
  by_status: Record<string, number>
  oldest_open_wait_seconds: number | null
  items: TicketRow[]
}

/** Query params shared by every analytics request. */
export interface AnalyticsQuery {
  period: Period
  from?: number
  to?: number
  channel?: string
  tenant_id?: string
}

