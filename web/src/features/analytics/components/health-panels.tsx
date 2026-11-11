import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyticsSummary, SampleStats } from '../schemas/analytics-schemas'
import { C, SERIES, axisProps, fmtCompact, fmtDuration, fmtPct, gridProps } from '../lib/format'
import { ChartTooltipBox } from './chart-primitives'

interface TooltipLikeProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

function Stat({ label, value, tone = C.text, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-l border-[#1C1C24] pl-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6B6B7C]">{label}</span>
      <span className="font-syne text-lg font-bold tabular-nums leading-none" style={{ color: tone }}>
        {value}
      </span>
      {sub && <span className="font-mono text-[9px] text-[#6B6B7C]">{sub}</span>}
    </div>
  )
}

export function LlmStats({ llm }: { llm: AnalyticsSummary['llm'] }) {
  const errRate = llm.calls ? llm.errors / llm.calls : null
  const tokensKnown = llm.tokens.prompt + llm.tokens.completion > 0
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="LLM calls" value={fmtCompact(llm.calls)} sub={`${Object.keys(llm.by_model).length} modelo(s)`} />
      <Stat
        label="Erros LLM"
        value={fmtPct(errRate)}
        tone={(errRate ?? 0) > 0.02 ? C.error : C.text}
        sub={`${llm.errors} falhas`}
      />
      <Stat label="p50 / p95" value={fmtDuration(llm.latency.p95)} sub={`p50 ${fmtDuration(llm.latency.p50)}`} />
      <Stat
        label="Tokens"
        value={tokensKnown ? fmtCompact(llm.tokens.prompt + llm.tokens.completion) : 'n/d'}
        sub={tokensKnown ? `in ${fmtCompact(llm.tokens.prompt)} · out ${fmtCompact(llm.tokens.completion)}` : 'provider sem `usage`'}
      />
    </div>
  )
}

export function MemoryTiers({ memory }: { memory: Record<string, SampleStats> }) {
  const tiers = Object.entries(memory)
  if (!tiers.length) return null
  const max = Math.max(...tiers.map(([, s]) => s.p95 ?? 0), 0.0001)
  return (
    <div className="flex flex-col gap-2">
      {tiers.map(([tier, s], i) => (
        <div key={tier} className="flex flex-col gap-1">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="uppercase tracking-wider" style={{ color: tier === 'fallback' ? C.warn : C.secondary }}>
              {tier}
              {tier === 'fallback' && ' ⚠ in-memory'}
            </span>
            <span className="tabular-nums text-[#9E9EB2]">
              p95 <span className="text-[#F4F4F8]">{fmtDuration(s.p95)}</span> · avg {fmtDuration(s.avg)} · hit{' '}
              {fmtPct(s.hit_rate, 0)} · n={fmtCompact(s.count)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#121218]">
            <div
              className="h-full"
              style={{ width: `${Math.max(2, ((s.p95 ?? 0) / max) * 100)}%`, background: SERIES[(i + 2) % SERIES.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DegradationList({ health }: { health: AnalyticsSummary['health'] }) {
  const sig = Object.values(health.signature_failures).reduce((a, b) => a + b, 0)
  const fallbacks = Object.values(health.fallback_events).reduce((a, b) => a + b, 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Fallbacks" value={fmtCompact(fallbacks)} tone={fallbacks ? C.warn : C.text} />
        <Stat label="Rate-limit" value={fmtCompact(health.rate_limited_total)} tone={health.rate_limited_total ? C.warn : C.text} />
        <Stat label="Assinatura inválida" value={fmtCompact(sig)} tone={sig ? C.error : C.text} sub="webhooks" />
        <Stat label="SSRF bloqueado" value={fmtCompact(health.ssrf_blocked)} tone={health.ssrf_blocked ? C.magenta : C.text} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {health.degraded_components.length ? (
          health.degraded_components.map((c) => (
            <span key={c} className="border border-[#FFB000]/40 bg-[#FFB000]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#FFB000]">
              ⚠ {c} degradado
            </span>
          ))
        ) : (
          <span className="border border-[#D4FF00]/30 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#D4FF00]">
            ● todos os componentes nominais
          </span>
        )}
        {Object.entries(health.rate_limited_by_identifier).map(([k, v]) => (
          <span key={k} className="border border-[#1C1C24] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#9E9EB2]">
            rl/{k}: {v}
          </span>
        ))}
        {Object.entries(health.signature_failures).map(([k, v]) => (
          <span key={k} className="border border-[#FF3B30]/30 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#FF3B30]">
            sig/{k}: {v}
          </span>
        ))}
      </div>
    </div>
  )
}

export function NodeDurationChart({ nodes }: { nodes: Record<string, SampleStats> }) {
  const rows = Object.entries(nodes)
    .map(([node, s]) => ({ node, p95: s.p95 ?? 0, avg: s.avg ?? 0, count: s.count }))
    .sort((a, b) => b.p95 - a.p95)
  const tip = ({ active, payload }: TooltipLikeProps) => {
    const r = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined
    if (!r) return null
    return (
      <ChartTooltipBox
        title={`NODE ${r.node}`}
        rows={[
          { key: 'p95', label: 'P95', value: fmtDuration(r.p95), color: C.accent },
          { key: 'avg', label: 'AVG', value: fmtDuration(r.avg), color: C.muted },
          { key: 'n', label: 'EXECUÇÕES', value: fmtCompact(r.count), color: C.text },
        ]}
      />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(150, rows.length * 22 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} horizontal={false} vertical />
        <XAxis type="number" tickFormatter={(v: number) => fmtDuration(v)} {...axisProps} />
        <YAxis type="category" dataKey="node" width={110} {...axisProps} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(212,255,0,0.04)' }} isAnimationActive={false} />
        <Bar
          dataKey="p95"
          isAnimationActive={false}
          label={{ position: 'right', fill: C.muted, fontSize: 9, formatter: (v: unknown) => fmtDuration(Number(v)) }}
        >
          {rows.map((r) => (
            <Cell key={r.node} fill={r.node === 'think' || r.node === 'execute_tools' ? C.accent : C.secondary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

