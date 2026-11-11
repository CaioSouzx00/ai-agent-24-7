import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import type { AnalyticsSummary, SparkPoint } from '../schemas/analytics-schemas'
import { C, delta, fmtCompact, fmtDuration, fmtPct } from '../lib/format'

interface KpiProps {
  index: string
  label: string
  value: string
  sub?: string
  /** relative change vs previous period */
  change?: number | null
  /** true when an increase is bad (latency, errors, handoffs) */
  inverse?: boolean
  spark?: SparkPoint[]
  tone?: 'accent' | 'warn' | 'error' | 'neutral'
  title?: string
}

const toneColor = { accent: C.accent, warn: C.warn, error: C.error, neutral: C.text }

function Sparkline({ data, color }: { data: SparkPoint[]; color: string }) {
  const rows = data.map((p) => ({ ts: p.ts, v: p.value }))
  const gid = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[0, 'auto']} />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.25}
          fill={`url(#${gid})`}
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Kpi({ index, label, value, sub, change, inverse, spark, tone = 'neutral', title }: KpiProps) {
  const color = toneColor[tone]
  const changeBad = change !== null && change !== undefined && (inverse ? change > 0.02 : change < -0.02)
  const changeGood = change !== null && change !== undefined && (inverse ? change < -0.02 : change > 0.02)
  return (
    <div
      title={title}
      className="group relative flex min-w-0 flex-col justify-between gap-1 border border-[#1C1C24] bg-[#0A0A0E] px-3 pt-2 pb-1 hover:border-[#32323E] transition-colors"
    >
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[#6B6B7C]">
        <span className="truncate">
          [{index}] {label}
        </span>
        {change !== null && change !== undefined && (
          <span
            className="tabular-nums"
            style={{ color: changeBad ? C.error : changeGood ? C.accent : C.muted }}
            title="vs período anterior equivalente"
          >
            {change > 0 ? '▲' : change < 0 ? '▼' : '■'} {Math.abs(change * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-syne text-2xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        {sub && <span className="truncate font-mono text-[10px] text-[#6B6B7C]">{sub}</span>}
      </div>
      <div className="h-7 -mx-1">{spark && spark.length > 1 && <Sparkline data={spark} color={color} />}</div>
      <span className="absolute left-0 top-0 h-full w-[2px] opacity-0 group-hover:opacity-100" style={{ background: color }} />
    </div>
  )
}

export function KpiStrip({ data, openTickets }: { data: AnalyticsSummary; openTickets?: number }) {
  const p = data.previous
  const autoTone = data.autonomous_rate === null ? 'neutral' : data.autonomous_rate >= 0.8 ? 'accent' : data.autonomous_rate >= 0.6 ? 'warn' : 'error'
  const handoffTone = (data.handoff_rate ?? 0) > 0.25 ? 'error' : (data.handoff_rate ?? 0) > 0.12 ? 'warn' : 'neutral'
  const toolErrTone = (data.tools.error_rate ?? 0) > 0.1 ? 'error' : (data.tools.error_rate ?? 0) > 0.03 ? 'warn' : 'neutral'

  return (
    <div className="grid grid-cols-2 gap-px sm:grid-cols-4 xl:grid-cols-7">
      <Kpi
        index="01"
        label="Conversas"
        value={fmtCompact(data.conversations)}
        sub={`${fmtCompact(data.volume)} turnos`}
        change={delta(data.conversations, p.conversations)}
        spark={data.sparklines.requests}
        tone="neutral"
        title="Sessões distintas com ao menos um turno tratado pelo agente"
      />
      <Kpi
        index="02"
        label="Resolução autônoma"
        value={fmtPct(data.autonomous_rate)}
        sub={`${fmtCompact(data.outcomes.autonomous_resolved)} turnos`}
        change={delta(data.autonomous_rate, p.autonomous_rate)}
        spark={data.sparklines.autonomous_rate}
        tone={autoTone}
        title="autonomous_resolved / (autonomous + handoff + error). Proxy: respondeu sem escalar nem falhar."
      />
      <Kpi
        index="03"
        label="Taxa de handoff"
        value={fmtPct(data.handoff_rate)}
        sub={`${fmtCompact(data.handoffs.total)} escalações`}
        change={delta(data.handoff_rate, p.handoff_rate)}
        inverse
        spark={data.sparklines.handoff_rate}
        tone={handoffTone}
      />
      <Kpi
        index="04"
        label="Latência p95"
        value={fmtDuration(data.latency.p95)}
        sub={`p50 ${fmtDuration(data.latency.p50)}`}
        change={delta(data.latency.p95, p.latency_p95)}
        inverse
        spark={data.sparklines.latency_p95}
        tone={(data.latency.p95 ?? 0) > 10 ? 'error' : (data.latency.p95 ?? 0) > 5 ? 'warn' : 'neutral'}
      />
      <Kpi
        index="05"
        label="Tickets / espera"
        value={openTickets === undefined ? '—' : String(openTickets)}
        sub={`espera média ${fmtDuration(data.handoffs.avg_wait_seconds)}`}
        tone={(openTickets ?? 0) > 5 || (data.handoffs.avg_wait_seconds ?? 0) > 600 ? 'error' : (openTickets ?? 0) > 0 ? 'warn' : 'neutral'}
        title="Tickets abertos (aguardando claim) agora · espera média criação→claim na janela"
      />
      <Kpi
        index="06"
        label="Erro em tools"
        value={fmtPct(data.tools.error_rate)}
        sub={`${fmtCompact(data.tools.errors)}/${fmtCompact(data.tools.total_calls)} calls`}
        inverse
        spark={data.sparklines.tool_error_rate}
        tone={toolErrTone}
      />
      <Kpi
        index="07"
        label="Rate-limit"
        value={fmtCompact(data.health.rate_limited_total)}
        sub="bloqueios"
        change={delta(data.rate_limited, p.rate_limited)}
        inverse
        spark={data.sparklines.rate_limited}
        tone={data.health.rate_limited_total > 0 ? 'warn' : 'neutral'}
      />
    </div>
  )
}

export function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px sm:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-[92px] animate-pulse border border-[#1C1C24] bg-[#0A0A0E]">
          <div className="m-3 h-2 w-20 bg-[#121218]" />
          <div className="mx-3 h-6 w-16 bg-[#121218]" />
        </div>
      ))}
    </div>
  )
}
