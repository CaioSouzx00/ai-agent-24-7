import { create } from 'zustand'
import type { AnalyticsQuery, Period } from '../schemas/analytics-schemas'

export type RefreshMs = 0 | 15000 | 30000 | 60000

interface AnalyticsUiState {
  period: Period
  /** custom absolute window (epoch seconds) — set by the range picker or by drag-zoom */
  range: { from: number; to: number } | null
  channel: string
  tenantId: string
  refreshMs: RefreshMs
  /** cross-filters that only affect tables/panels below the charts */
  outcomeFilter: string | null
  reasonFilter: string | null
  selectedTool: string | null

  setPeriod: (p: Period) => void
  setRange: (r: { from: number; to: number } | null) => void
  setChannel: (c: string) => void
  setTenantId: (t: string) => void
  setRefreshMs: (ms: RefreshMs) => void
  setOutcomeFilter: (o: string | null) => void
  setReasonFilter: (r: string | null) => void
  setSelectedTool: (t: string | null) => void
  clearCrossFilters: () => void
}

export const useAnalyticsStore = create<AnalyticsUiState>((set) => ({
  period: '24h',
  range: null,
  channel: 'all',
  tenantId: '',
  refreshMs: 30000,
  outcomeFilter: null,
  reasonFilter: null,
  selectedTool: null,

  setPeriod: (period) => set({ period, range: null }),
  setRange: (range) => set({ range }),
  setChannel: (channel) => set({ channel }),
  setTenantId: (tenantId) => set({ tenantId }),
  setRefreshMs: (refreshMs) => set({ refreshMs }),
  setOutcomeFilter: (outcomeFilter) => set({ outcomeFilter }),
  setReasonFilter: (reasonFilter) => set({ reasonFilter }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  clearCrossFilters: () => set({ outcomeFilter: null, reasonFilter: null, channel: 'all' }),
}))

/** Stable query object derived from UI state (used as TanStack Query key). */
export function useAnalyticsQuery(): AnalyticsQuery {
  const period = useAnalyticsStore((s) => s.period)
  const range = useAnalyticsStore((s) => s.range)
  const channel = useAnalyticsStore((s) => s.channel)
  const tenantId = useAnalyticsStore((s) => s.tenantId)
  return {
    period,
    from: range ? Math.floor(range.from) : undefined,
    to: range ? Math.ceil(range.to) : undefined,
    channel: channel === 'all' ? undefined : channel,
    tenant_id: tenantId.trim() || undefined,
  }
}

