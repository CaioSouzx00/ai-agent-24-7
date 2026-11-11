import { useEffect } from 'react'
import { X } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAnalyticsToolDetail } from '../api/use-analytics'
import { useAnalyticsStore } from '../store/analytics-store'
import { C, axisProps, errorRamp, fmtCompact, fmtDateTime, fmtDuration, fmtPct, fmtTime, gridProps } from '../lib/format'
import { ChartTooltipBox } from './chart-primitives'
import { PanelEmpty, PanelSkeleton } from './panel'

interface TooltipLikeProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

export function ToolDrawer() {
  const tool = useAnalyticsStore((s) => s.selectedTool)
  const close = useAnalyticsStore((s) => s.setSelectedTool)
  const { data, isLoading, isError } = useAnalyticsToolDetail(tool)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!tool) return null
  const span = data ? (data.series.at(-1)?.ts ?? 0) - (data.series[0]?.ts ?? 0) : 86400

  const tip = ({ active, payload }: TooltipLikeProps) => {
    const p = active ? (payload?.[0]?.payload as { ts: number; calls: number; errors: number; p95: number | null } | undefined) : undefined
    if (!p) return null
    return (
      <ChartTooltipBox
        title={fmtDateTime(p.ts)}
        rows={[
          { key: 'c', label: 'CALLS', value: fmtCompact(p.calls), color: C.secondary },
          { key: 'e', label: 'ERRORS', value: fmtCompact(p.errors), color: C.error },
          { key: 'p', label: 'P95', value: fmtDuration(p.p95), color: C.accent },
        ]}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]" onClick={() => close(null)}>
      <aside
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[#32323E] bg-[#040405]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1C1C24] bg-[#040405] px-5 py-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#6B6B7C]">[TOOL // DRILL-DOWN]</div>
            <h2 className="font-display text-3xl leading-none text-[#F4F4F8]">{tool}</h2>
          </div>
          <button type="button" onClick={() => close(null)} className="border border-[#1C1C24] p-1.5 text-[#9E9EB2] hover:border-[#D4FF00] hover:text-[#D4FF00]">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-5">
          {isLoading ? (
            <PanelSkeleton />
          ) : isError || !data ? (
            <PanelEmpty label="SEM EXECUÇÕES DESTA TOOL NA JANELA" />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-px border border-[#1C1C24] bg-[#1C1C24]">
                {[
                  ['CALLS', fmtCompact(data.calls), C.text],
                  ['ERROR RATE', fmtPct(data.error_rate), errorRamp(data.error_rate)],
                  ['P50', fmtDuration(data.latency.p50), C.text],
                  ['P95', fmtDuration(data.latency.p95), C.accent],
                  ['P99', fmtDuration(data.latency.p99), C.text],
                  ['MAX', fmtDuration(data.latency.max), C.text],
                  ['ERRORS', fmtCompact(data.errors), data.errors ? C.error : C.text],
                  ['AVG', fmtDuration(data.latency.avg), C.text],
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-[#0A0A0E] px-3 py-2">
                    <div className="font-mono text-[9px] tracking-[0.16em] text-[#6B6B7C]">{label}</div>
                    <div className="font-syne text-lg font-bold tabular-nums" style={{ color }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9E9EB2]">// Calls, erros & p95</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={data.series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v: number) => fmtTime(v, span)} minTickGap={40} {...axisProps} />
                    <YAxis yAxisId="c" width={32} allowDecimals={false} {...axisProps} />
                    <YAxis yAxisId="l" orientation="right" width={44} tickFormatter={(v: number) => fmtDuration(v)} {...axisProps} />
                    <Tooltip content={tip} isAnimationActive={false} />
                    <Bar yAxisId="c" dataKey="calls" stackId="x" fill={C.surface3} isAnimationActive={false} />
                    <Bar yAxisId="c" dataKey="errors" stackId="x" fill={C.error} isAnimationActive={false} />
                    <Line yAxisId="l" dataKey="p95" stroke={C.accent} dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </section>

              {Object.keys(data.error_types).length > 0 && (
                <section>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9E9EB2]">// Classes de erro</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.error_types)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <span key={k} className="border border-[#FF3B30]/40 px-2 py-0.5 font-mono text-[10px] uppercase text-[#FF3B30]">
                          {k} · {v}
                        </span>
                      ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9E9EB2]">// Últimas execuções</h3>
                <table className="w-full border-collapse font-mono text-[10px]">
                  <thead>
                    <tr className="text-left text-[#6B6B7C]">
                      <th className="border-b border-[#1C1C24] py-1 font-normal">QUANDO</th>
                      <th className="border-b border-[#1C1C24] py-1 font-normal">STATUS</th>
                      <th className="border-b border-[#1C1C24] py-1 text-right font-normal">DURAÇÃO</th>
                      <th className="border-b border-[#1C1C24] py-1 pl-3 font-normal">CANAL</th>
                      <th className="border-b border-[#1C1C24] py-1 font-normal">SESSÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((e, i) => (
                      <tr key={`${e.ts}-${i}`} className="hover:bg-[#121218]">
                        <td className="border-b border-[#121218] py-1 text-[#9E9EB2]">{fmtDateTime(e.ts)}</td>
                        <td className="border-b border-[#121218] py-1" style={{ color: e.success ? C.accent : C.error }}>
                          {e.success ? 'OK' : (e.error_type ?? 'ERRO').toUpperCase()}
                        </td>
                        <td className="border-b border-[#121218] py-1 text-right tabular-nums text-[#F4F4F8]">{fmtDuration(e.duration)}</td>
                        <td className="border-b border-[#121218] py-1 pl-3 text-[#9E9EB2]">{e.channel}</td>
                        <td className="max-w-[120px] truncate border-b border-[#121218] py-1 text-[#6B6B7C]" title={e.session_id}>
                          {e.session_id || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

