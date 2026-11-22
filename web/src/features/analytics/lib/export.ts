/** CSV export of the current cockpit view (pure helpers + browser download). */
import type { AnalyticsSummary, ConversationRow } from '../schemas/analytics-schemas'

type Cell = string | number | null | undefined

const esc = (v: Cell): string => `"${String(v ?? '').replace(/"/g, '""')}"`

export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

/** Long format (section,key,metric,value) for KPIs/tools/reasons + one wide block per conversation. */
export function buildAnalyticsCsv(summary?: AnalyticsSummary, conversations: ConversationRow[] = []): string {
  const rows: Cell[][] = [['section', 'key', 'metric', 'value']]
  if (summary) {
    const kpis: [string, string, Cell][] = [
      ['conversations', 'count', summary.conversations],
      ['volume', 'turns', summary.volume],
      ['autonomous_rate', 'ratio', summary.autonomous_rate],
      ['handoff_rate', 'ratio', summary.handoff_rate],
      ['error_rate', 'ratio', summary.error_rate],
      ['latency_p50', 'seconds', summary.latency.p50],
      ['latency_p95', 'seconds', summary.latency.p95],
      ['latency_p99', 'seconds', summary.latency.p99],
      ['rate_limited', 'count', summary.health.rate_limited_total],
    ]
    for (const [key, metric, value] of kpis) rows.push(['kpi', key, metric, value])
    for (const t of summary.tools.top) {
      rows.push(['tool', t.tool, 'calls', t.calls], ['tool', t.tool, 'error_rate', t.error_rate])
      rows.push(['tool', t.tool, 'latency_p95', t.latency.p95])
    }
    for (const [reason, count] of Object.entries(summary.handoffs.by_reason)) {
      rows.push(['handoff_reason', reason, 'count', count])
    }
  }
  if (conversations.length) {
    rows.push([], ['session_id', 'channel', 'tenant_id', 'outcome', 'handoff_reason', 'turns', 'tool_calls', 'duration_seconds', 'last_at'])
    for (const c of conversations) {
      rows.push([
        c.session_id,
        c.channel,
        c.tenant_id,
        c.outcome,
        c.handoff_reason,
        c.turns,
        c.tool_calls,
        c.duration_seconds,
        new Date(c.last_at * 1000).toISOString(),
      ])
    }
  }
  return toCsv(rows)
}

export function downloadText(content: string, filename: string, mime = 'text/csv;charset=utf-8;'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
