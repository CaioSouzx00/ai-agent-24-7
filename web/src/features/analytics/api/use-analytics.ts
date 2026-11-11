import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAnalyticsQuery, useAnalyticsStore } from '../store/analytics-store'
import {
  fetchConversations,
  fetchSummary,
  fetchTickets,
  fetchTimeseries,
  fetchToolDetail,
  fetchTools,
} from './analytics-api'

/** Backend caches aggregates ~5s, so anything shorter is wasted work. */
const STALE_MS = 5_000

function useRefetchInterval(): number | false {
  const ms = useAnalyticsStore((s) => s.refreshMs)
  return ms > 0 ? ms : false
}

export function useAnalyticsSummary() {
  const q = useAnalyticsQuery()
  return useQuery({
    queryKey: ['analytics', 'summary', q],
    queryFn: () => fetchSummary(q),
    staleTime: STALE_MS,
    refetchInterval: useRefetchInterval(),
    placeholderData: keepPreviousData,
  })
}

export function useAnalyticsTimeseries(metric: string, groupBy?: string) {
  const q = useAnalyticsQuery()
  return useQuery({
    queryKey: ['analytics', 'timeseries', metric, groupBy ?? null, q],
    queryFn: () => fetchTimeseries(q, metric, groupBy),
    staleTime: STALE_MS,
    refetchInterval: useRefetchInterval(),
    placeholderData: keepPreviousData,
  })
}

export function useAnalyticsConversations(limit = 50, offset = 0) {
  const q = useAnalyticsQuery()
  const status = useAnalyticsStore((s) => s.outcomeFilter)
  return useQuery({
    queryKey: ['analytics', 'conversations', q, limit, offset, status],
    queryFn: () => fetchConversations(q, { limit, offset, status }),
    staleTime: STALE_MS,
    refetchInterval: useRefetchInterval(),
    placeholderData: keepPreviousData,
  })
}

export function useAnalyticsTools() {
  const q = useAnalyticsQuery()
  return useQuery({
    queryKey: ['analytics', 'tools', q],
    queryFn: () => fetchTools(q),
    staleTime: STALE_MS,
    refetchInterval: useRefetchInterval(),
    placeholderData: keepPreviousData,
  })
}

export function useAnalyticsToolDetail(tool: string | null) {
  const q = useAnalyticsQuery()
  return useQuery({
    queryKey: ['analytics', 'tool', tool, q],
    queryFn: () => fetchToolDetail(q, tool as string),
    enabled: !!tool,
    staleTime: STALE_MS,
    retry: false,
  })
}

export function useAnalyticsTickets() {
  const q = useAnalyticsQuery()
  return useQuery({
    queryKey: ['analytics', 'tickets', q.channel, q.tenant_id],
    queryFn: () => fetchTickets(q),
    staleTime: STALE_MS,
    refetchInterval: useRefetchInterval(),
    placeholderData: keepPreviousData,
  })
}

