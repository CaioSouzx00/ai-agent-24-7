import { apiClient } from '@/shared/lib/api-client'
import type {
  AnalyticsQuery,
  AnalyticsSummary,
  ConversationsResponse,
  TicketsResponse,
  TimeseriesResponse,
  ToolDetail,
  ToolsResponse,
} from '../schemas/analytics-schemas'

type Params = Record<string, string | number | boolean | undefined>

const base = '/api/analytics'

const toParams = (q: AnalyticsQuery, extra: Params = {}): Params => ({
  period: q.period,
  from: q.from,
  to: q.to,
  channel: q.channel,
  tenant_id: q.tenant_id,
  ...extra,
})

export const fetchSummary = (q: AnalyticsQuery) =>
  apiClient.get<AnalyticsSummary>(`${base}/summary`, { params: toParams(q) })

export const fetchTimeseries = (q: AnalyticsQuery, metric: string, groupBy?: string, step?: string) =>
  apiClient.get<TimeseriesResponse>(`${base}/timeseries`, {
    params: toParams(q, { metric, group_by: groupBy, step }),
  })

export const fetchConversations = (
  q: AnalyticsQuery,
  opts: { limit?: number; offset?: number; status?: string | null } = {}
) =>
  apiClient.get<ConversationsResponse>(`${base}/conversations`, {
    params: {
      channel: q.channel,
      tenant_id: q.tenant_id,
      from: q.from,
      to: q.to,
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
      status: opts.status ?? undefined,
    },
  })

export const fetchTools = (q: AnalyticsQuery) => apiClient.get<ToolsResponse>(`${base}/tools`, { params: toParams(q) })

export const fetchToolDetail = (q: AnalyticsQuery, tool: string) =>
  apiClient.get<ToolDetail>(`${base}/tools/${encodeURIComponent(tool)}`, { params: toParams(q) })

export const fetchTickets = (q: AnalyticsQuery, limit = 30) =>
  apiClient.get<TicketsResponse>(`${base}/tickets`, {
    params: { channel: q.channel, tenant_id: q.tenant_id, limit },
  })

/** Raw Prometheus exposition filtered to agent_* families (for "Copy snapshot"). */
export async function fetchPrometheusSnapshot(): Promise<string> {
  const text = await apiClient.get<string>('/metrics', { responseType: 'text' })
  return text
    .split('\n')
    .filter((l) => /^(# (HELP|TYPE) )?agent_/.test(l) && !/_created[{ ]/.test(l))
    .join('\n')
}

