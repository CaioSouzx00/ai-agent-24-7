import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { AnalyticsSummary, ToolStats } from '../schemas/analytics-schemas'
import {
  C,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  REASON_LABELS,
  axisProps,
  errorRamp,
  fmtCompact,
  fmtDuration,
  fmtPct,
  gridProps,
} from '../lib/format'
import { ChartTooltipBox } from './chart-primitives'

interface TooltipLikeProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

// ---------------------------------------------------------------------------
// Outcomes donut — click a slice to filter the conversations table
// ---------------------------------------------------------------------------
export function OutcomesChart({
  outcomes,
  active,
  onSelect,
}: {
  outcomes: AnalyticsSummary['outcomes']
  active: string | null
  onSelect: (o: string | null) => void
}) {
  const rows = Object.entries(outcomes)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ key: k, value: v }))
  const total = rows.reduce((s, r) => s + r.value, 0)

  const tip = ({ active: on, payload }: TooltipLikeProps) => {
    const r = on ? (payload?.[0]?.payload as { key: string; value: number } | undefined) : undefined
    if (!r) return null
    return (
      <ChartTooltipBox
        title="OUTCOME"
        rows={[
          {
            key: r.key,
            label: OUTCOME_LABELS[r.key] ?? r.key,
            value: `${fmtCompact(r.value)} · ${fmtPct(r.value / total)}`,
            color: OUTCOME_COLORS[r.key] ?? C.text,
          },
        ]}
        footer="clique para filtrar conversas"
      />
    )
  }

  return (
    <div className="flex h-full items-center gap-3">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="key"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={1}
              stroke={C.bg}
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(d: { key?: string }) => d?.key && onSelect(active === d.key ? null : d.key)}
            >
              {rows.map((r) => (
                <Cell
                  key={r.key}
                  fill={OUTCOME_COLORS[r.key] ?? C.text}
                  fillOpacity={active && active !== r.key ? 0.25 : 1}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={tip} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-syne text-xl font-bold text-[#F4F4F8]">{fmtCompact(total)}</span>
          <span className="font-mono text-[9px] tracking-widest text-[#6B6B7C]">TURNOS</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {rows
          .sort((a, b) => b.value - a.value)
          .map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => onSelect(active === r.key ? null : r.key)}
                className={`flex w-full items-center justify-between gap-2 border-l-2 px-2 py-1 text-left font-mono text-[10px] transition-colors ${
                  active === r.key ? 'bg-[#121218]' : 'hover:bg-[#121218]'
                }`}
                style={{ borderColor: OUTCOME_COLORS[r.key] ?? C.text }}
              >
                <span className="truncate text-[#9E9EB2]">{OUTCOME_LABELS[r.key] ?? r.key}</span>
                <span className="tabular-nums text-[#F4F4F8]">{fmtPct(r.value / total)}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top tools — horizontal bars colored by error-rate; click opens the drawer
// ---------------------------------------------------------------------------
export function TopToolsChart({ tools, onSelect }: { tools: ToolStats[]; onSelect: (tool: string) => void }) {
  const rows = tools.slice(0, 10)
  const tip = ({ active, payload }: TooltipLikeProps) => {
    const t = active ? (payload?.[0]?.payload as ToolStats | undefined) : undefined
    if (!t) return null
    return (
      <ChartTooltipBox
        title={t.tool}
        rows={[
          { key: 'calls', label: 'CALLS', value: fmtCompact(t.calls), color: C.text },
          { key: 'err', label: 'ERROR RATE', value: fmtPct(t.error_rate), color: errorRamp(t.error_rate) },
          { key: 'p50', label: 'P50', value: fmtDuration(t.latency.p50), color: C.muted },
          { key: 'p95', label: 'P95', value: fmtDuration(t.latency.p95), color: C.cyan },
        ]}
        footer="clique para detalhes"
      />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 26 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} horizontal={false} vertical />
        <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtCompact(v)} />
        <YAxis type="category" dataKey="tool" width={110} {...axisProps} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(212,255,0,0.04)' }} isAnimationActive={false} />
        <Bar
          dataKey="calls"
          isAnimationActive={false}
          onClick={(d: { tool?: string }) => d?.tool && onSelect(d.tool)}
          label={{
            position: 'right',
            fill: C.muted,
            fontSize: 9,
            fontFamily: '"JetBrains Mono", monospace',
            formatter: (v: unknown) => fmtCompact(Number(v)),
          }}
        >
          {rows.map((t) => (
            <Cell key={t.tool} fill={errorRamp(t.error_rate)} style={{ cursor: 'pointer' }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Handoffs by reason — click to filter
// ---------------------------------------------------------------------------
export function HandoffReasonsChart({
  byReason,
  active,
  onSelect,
}: {
  byReason: Record<string, number>
  active: string | null
  onSelect: (r: string | null) => void
}) {
  const total = Object.values(byReason).reduce((s, v) => s + v, 0)
  const rows = Object.entries(byReason)
    .map(([reason, count]) => ({ reason, count, label: REASON_LABELS[reason] ?? reason }))
    .sort((a, b) => b.count - a.count)
  const tip = ({ active: on, payload }: TooltipLikeProps) => {
    const r = on ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined
    if (!r) return null
    return (
      <ChartTooltipBox
        title="HANDOFF REASON"
        rows={[{ key: r.reason, label: r.label, value: `${r.count} · ${fmtPct(total ? r.count / total : null)}`, color: C.warn }]}
        footer={
          r.reason === 'frustration' || r.reason === 'low_confidence'
            ? 'reservado: o detector atual (keywords) não emite este motivo'
            : 'clique para filtrar'
        }
      />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} horizontal={false} vertical />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="label" width={150} {...axisProps} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(255,176,0,0.05)' }} isAnimationActive={false} />
        <Bar
          dataKey="count"
          isAnimationActive={false}
          onClick={(d: { reason?: string }) => d?.reason && onSelect(active === d.reason ? null : d.reason)}
          label={{ position: 'right', fill: C.muted, fontSize: 9 }}
        >
          {rows.map((r) => (
            <Cell
              key={r.reason}
              fill={C.warn}
              fillOpacity={active && active !== r.reason ? 0.25 : r.count ? 1 : 0.2}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Tools per conversation — distribution
// ---------------------------------------------------------------------------
export function ToolsPerConversationChart({ dist }: { dist: { bucket: string; count: number }[] }) {
  const total = dist.reduce((s, d) => s + d.count, 0)
  const tip = ({ active, payload }: TooltipLikeProps) => {
    const d = active ? (payload?.[0]?.payload as { bucket: string; count: number } | undefined) : undefined
    if (!d) return null
    return (
      <ChartTooltipBox
        title={`${d.bucket} TOOL CALLS`}
        rows={[{ key: 'c', label: 'CONVERSAS', value: `${d.count} · ${fmtPct(total ? d.count / total : null)}`, color: C.cyan }]}
      />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dist} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="bucket" {...axisProps} />
        <YAxis width={36} allowDecimals={false} {...axisProps} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(0,229,255,0.05)' }} isAnimationActive={false} />
        <Bar dataKey="count" isAnimationActive={false}>
          {dist.map((d) => (
            <Cell key={d.bucket} fill={d.bucket === '0' ? C.muted : C.cyan} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

