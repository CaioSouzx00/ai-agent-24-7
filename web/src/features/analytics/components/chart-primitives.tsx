import { C } from '../lib/format'

export interface TooltipRow {
  key: string
  label: string
  value: string
  color: string
}

/** Dense mono tooltip shared by every chart. Sorted desc by raw value when provided. */
export function ChartTooltipBox({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: string }) {
  if (!rows.length) return null
  return (
    <div
      className="min-w-[180px] border px-3 py-2 font-mono text-[10px] shadow-2xl"
      style={{ background: 'rgba(4,4,5,0.96)', borderColor: C.borderStrong }}
    >
      <div className="mb-1.5 border-b pb-1 text-[#9E9EB2]" style={{ borderColor: C.border }}>
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#9E9EB2]">
              <span className="h-2 w-2" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="tabular-nums text-[#F4F4F8]">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t pt-1 text-[#6B6B7C]" style={{ borderColor: C.border }}>{footer}</div>}
    </div>
  )
}

/** Clickable legend: click = toggle visibility, alt/⌥-click = isolate; optional cross-filter action. */
export function SeriesLegend({
  keys,
  hidden,
  colors,
  labels,
  onToggle,
  onIsolate,
  onFilter,
}: {
  keys: string[]
  hidden: Set<string>
  colors: Record<string, string>
  labels?: Record<string, string>
  onToggle: (k: string) => void
  onIsolate: (k: string) => void
  onFilter?: (k: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2">
      {keys.map((k) => {
        const off = hidden.has(k)
        return (
          <span key={k} className="inline-flex items-center gap-1">
            <button
              type="button"
              title="clique: mostrar/ocultar · alt+clique: isolar"
              onClick={(e) => (e.altKey ? onIsolate(k) : onToggle(k))}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-opacity"
              style={{ opacity: off ? 0.35 : 1 }}
            >
              <span className="h-[3px] w-3" style={{ background: colors[k] }} />
              <span className={off ? 'line-through text-[#6B6B7C]' : 'text-[#9E9EB2] hover:text-[#F4F4F8]'}>
                {labels?.[k] ?? k}
              </span>
            </button>
            {onFilter && (
              <button
                type="button"
                title={`filtrar a página por ${k}`}
                onClick={() => onFilter(k)}
                className="font-mono text-[9px] text-[#32323E] hover:text-[#D4FF00]"
              >
                ⊕
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}

