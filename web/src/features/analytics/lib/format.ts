/** Number formatting + chart theme for the Agent Behavior cockpit. */

export const fmtCompact = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Ratio (0..1) → percent string. */
export const fmtPct = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`

/** Seconds → 450ms / 2.3s / 4m 10s / 1h 05m. */
export const fmtDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}m`
  return `${(seconds / 86400).toFixed(1)}d`
}

/** Relative change; `null` when the previous period is empty. */
export const delta = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export const fmtTime = (tsSeconds: number, spanSeconds: number): string => {
  const d = new Date(tsSeconds * 1000)
  if (spanSeconds <= 86400) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export const fmtDateTime = (tsSeconds: number): string =>
  new Date(tsSeconds * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

// ---------------------------------------------------------------------------
// Theme — Dark Editorial Brutalista (Obsidian Carbon + Acid Volt). No pastels.
// ---------------------------------------------------------------------------
export const C = {
  bg: '#040405',
  surface1: '#0A0A0E',
  surface2: '#121218',
  surface3: '#1A1A22',
  border: '#1C1C24',
  borderStrong: '#32323E',
  muted: '#6B6B7C',
  secondary: '#9E9EB2',
  text: '#F4F4F8',
  accent: '#D4FF00',
  error: '#FF3B30',
  warn: '#FFB000',
  cyan: '#00E5FF',
  magenta: '#FF2E88',
  orange: '#FF6B00',
  violet: '#8B5CF6',
} as const

/** Ordered high-contrast series palette. */
export const SERIES = [C.accent, C.text, C.cyan, C.magenta, C.orange, C.violet, C.warn, C.muted]

export const OUTCOME_COLORS: Record<string, string> = {
  autonomous_resolved: C.accent,
  handoff: C.warn,
  error: C.error,
  rate_limited: C.magenta,
  human_active: C.muted,
}

export const OUTCOME_LABELS: Record<string, string> = {
  autonomous_resolved: 'AUTÔNOMO',
  handoff: 'HANDOFF',
  error: 'ERRO',
  rate_limited: 'RATE-LIMIT',
  human_active: 'HUMANO ATIVO',
}

export const REASON_LABELS: Record<string, string> = {
  human_requested: 'PEDIU HUMANO',
  cancel: 'CANCELAMENTO/REEMBOLSO',
  complex: 'COMPLEXO/LEGAL',
  frustration: 'FRUSTRAÇÃO',
  low_confidence: 'BAIXA CONFIANÇA',
  other: 'OUTRO',
}

export const colorFor = (key: string, index: number): string =>
  OUTCOME_COLORS[key] ?? SERIES[index % SERIES.length]

/** Shared recharts axis/grid props. */
export const axisProps = {
  stroke: C.borderStrong,
  tick: { fill: C.muted, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' },
  tickLine: false,
  axisLine: { stroke: C.border },
} as const

export const gridProps = {
  stroke: C.border,
  strokeDasharray: '2 4',
  vertical: false,
} as const

/** Error-rate → color ramp for bars (volt → amber → red). */
export const errorRamp = (rate: number): string => (rate >= 0.1 ? C.error : rate >= 0.03 ? C.warn : C.accent)

