import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimeseriesResponse } from '../schemas/analytics-schemas'
import { C, axisProps, colorFor, fmtDateTime, fmtTime, gridProps } from '../lib/format'
import { ChartTooltipBox, SeriesLegend } from './chart-primitives'

export type Row = { ts: number } & Record<string, number | null>

/** Long → wide: one row per bucket, one column per label value. */
export function pivotTimeseries(resp: TimeseriesResponse | undefined, labelKey?: string, fallbackKey = 'value') {
  const rows = new Map<number, Row>()
  const keys = new Set<string>()
  for (const p of resp?.points ?? []) {
    const k = labelKey ? (p.labels?.[labelKey] ?? 'unknown') : fallbackKey
    keys.add(k)
    const row = rows.get(p.ts) ?? ({ ts: p.ts } as Row)
    row[k] = p.value
    rows.set(p.ts, row)
  }
  return { rows: [...rows.values()].sort((a, b) => a.ts - b.ts), keys: [...keys] }
}

/** Merge several single-series responses into one wide dataset (e.g. p50/p95/p99). */
export function mergeSeries(series: Record<string, TimeseriesResponse | undefined>) {
  const rows = new Map<number, Row>()
  for (const [key, resp] of Object.entries(series)) {
    for (const p of resp?.points ?? []) {
      const row = rows.get(p.ts) ?? ({ ts: p.ts } as Row)
      row[key] = p.value
      rows.set(p.ts, row)
    }
  }
  return [...rows.values()].sort((a, b) => a.ts - b.ts)
}

interface TooltipLikeProps {
  active?: boolean
  label?: unknown
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown; color?: string }>
}

interface Props {
  data: Row[]
  keys: string[]
  kind?: 'line' | 'area' | 'stacked'
  format: (v: number | null) => string
  spanSeconds: number
  height?: number
  labels?: Record<string, string>
  colors?: Record<string, string>
  yDomain?: [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax']
  reference?: { y: number; label: string; color?: string }
  onZoom?: (from: number, to: number) => void
  onSeriesFilter?: (key: string) => void
  showTotal?: boolean
}

export function TimeSeriesChart({
  data,
  keys,
  kind = 'line',
  format,
  spanSeconds,
  height = 220,
  labels,
  colors: colorOverride,
  yDomain,
  reference,
  onZoom,
  onSeriesFilter,
  showTotal,
}: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [drag, setDrag] = useState<{ a: number; b: number | null } | null>(null)

  const colors = useMemo(
    () => Object.fromEntries(keys.map((k, i) => [k, colorOverride?.[k] ?? colorFor(k, i)])),
    [keys, colorOverride]
  )
  const visible = keys.filter((k) => !hidden.has(k))

  const toggle = (k: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  const isolate = (k: string) =>
    setHidden((prev) => (prev.size === keys.length - 1 && !prev.has(k) ? new Set() : new Set(keys.filter((x) => x !== k))))

  const renderTooltip = ({ active, payload, label }: TooltipLikeProps) => {
    if (!active || !payload?.length || typeof label !== 'number') return null
    const rows = payload
      .filter((p) => p.value !== null && p.value !== undefined)
      .map((p) => ({ key: String(p.dataKey), raw: Number(p.value), color: p.color ?? C.text }))
      .sort((a, b) => b.raw - a.raw)
    const total = rows.reduce((s, r) => s + r.raw, 0)
    return (
      <ChartTooltipBox
        title={fmtDateTime(label)}
        rows={rows.map((r) => ({ key: r.key, label: labels?.[r.key] ?? r.key, value: format(r.raw), color: r.color }))}
        footer={showTotal && rows.length > 1 ? `TOTAL ${format(total)}` : onZoom ? 'arraste para dar zoom' : undefined}
      />
    )
  }

  // --- Grafana-style drag-to-zoom -------------------------------------------------------
  const zoomHandlers = onZoom
    ? {
        onMouseDown: (s: { activeLabel?: unknown }) => {
          if (typeof s?.activeLabel === 'number') setDrag({ a: s.activeLabel, b: null })
        },
        onMouseMove: (s: { activeLabel?: unknown }) => {
          if (drag && typeof s?.activeLabel === 'number') setDrag({ ...drag, b: s.activeLabel })
        },
        onMouseUp: () => {
          if (drag?.b !== null && drag?.b !== undefined && drag.a !== drag.b) {
            onZoom(Math.min(drag.a, drag.b), Math.max(drag.a, drag.b))
          }
          setDrag(null)
        },
        onMouseLeave: () => setDrag(null),
      }
    : {}

  const common = (
    <>
      <CartesianGrid {...gridProps} />
      <XAxis
        dataKey="ts"
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
        tickFormatter={(v: number) => fmtTime(v, spanSeconds)}
        minTickGap={40}
        {...axisProps}
      />
      <YAxis
        width={48}
        tickFormatter={(v: number) => format(v)}
        domain={yDomain ?? [0, 'auto']}
        allowDecimals
        {...axisProps}
      />
      <Tooltip
        content={renderTooltip}
        cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: '3 3' }}
        isAnimationActive={false}
      />
      {reference && (
        <ReferenceLine
          y={reference.y}
          stroke={reference.color ?? C.error}
          strokeDasharray="4 4"
          label={{ value: reference.label, fill: reference.color ?? C.error, fontSize: 9, position: 'insideTopRight' }}
        />
      )}
      {drag?.b !== null && drag?.b !== undefined && (
        <ReferenceArea x1={drag.a} x2={drag.b} fill={C.accent} fillOpacity={0.08} stroke={C.accent} strokeOpacity={0.4} />
      )}
    </>
  )

  return (
    <div className="select-none">
      <ResponsiveContainer width="100%" height={height}>
        {kind === 'line' ? (
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} {...zoomHandlers}>
            {common}
            {visible.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={colors[k]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, stroke: C.bg, strokeWidth: 1 }}
                isAnimationActive={false}
                connectNulls={false}
                onClick={onSeriesFilter ? () => onSeriesFilter(k) : undefined}
                style={onSeriesFilter ? { cursor: 'pointer' } : undefined}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} {...zoomHandlers}>
            {common}
            {visible.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId={kind === 'stacked' ? 's' : undefined}
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={kind === 'stacked' ? 0.35 : 0.12}
                strokeWidth={1.25}
                isAnimationActive={false}
                onClick={onSeriesFilter ? () => onSeriesFilter(k) : undefined}
                style={onSeriesFilter ? { cursor: 'pointer' } : undefined}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
      {keys.length > 1 && (
        <SeriesLegend
          keys={keys}
          hidden={hidden}
          colors={colors}
          labels={labels}
          onToggle={toggle}
          onIsolate={isolate}
          onFilter={onSeriesFilter}
        />
      )}
    </div>
  )
}

