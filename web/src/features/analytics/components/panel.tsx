import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface PanelProps {
  title: string
  /** short source hint shown on hover, e.g. the metric or endpoint feeding the panel */
  source?: string
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyLabel?: string
  children: ReactNode
}

/** Grafana-style panel: hairline frame, mono title bar, loading + empty states built in. */
export function Panel({
  title,
  source,
  actions,
  className,
  bodyClassName,
  isLoading,
  isEmpty,
  emptyLabel = 'SEM DADOS NA JANELA SELECIONADA',
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        'relative flex flex-col border border-[#1C1C24] bg-[#0A0A0E] min-w-0',
        'hover:border-[#32323E] transition-colors',
        className
      )}
    >
      <header className="flex h-8 items-center justify-between gap-2 border-b border-[#1C1C24] px-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 shrink-0 bg-[#D4FF00]" />
          <h3 className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[#9E9EB2]">{title}</h3>
          {source && (
            <span title={source} className="text-[#6B6B7C] hover:text-[#D4FF00] cursor-help">
              <Info className="h-3 w-3" />
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      <div className={cn('relative flex-1 p-3', bodyClassName)}>
        {isLoading ? <PanelSkeleton /> : isEmpty ? <PanelEmpty label={emptyLabel} /> : children}
      </div>
    </section>
  )
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full min-h-[140px] w-full flex-col justify-end gap-1.5', className)}>
      <div className="flex h-full items-end gap-1">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse bg-[#121218]"
            style={{ height: `${25 + ((i * 37) % 60)}%`, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <div className="h-px w-full bg-[#1C1C24]" />
    </div>
  )
}

export function PanelEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 border border-dashed border-[#1C1C24]">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#6B6B7C]">// {label}</span>
      <span className="font-mono text-[9px] text-[#32323E]">AMPLIE O PERÍODO OU REMOVA FILTROS</span>
    </div>
  )
}

/** Small mono chip used for filters / tags. */
export function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors',
        active
          ? 'border-[#D4FF00] bg-[#D4FF00]/10 text-[#D4FF00]'
          : 'border-[#1C1C24] text-[#9E9EB2] hover:border-[#32323E] hover:text-[#F4F4F8]'
      )}
    >
      {color && <span className="h-2 w-2" style={{ background: color }} />}
      {children}
    </button>
  )
}

