import { useState } from 'react'
import {
  Calendar,
  Copy,
  Download,
  ExternalLink,
  FilterX,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui'
import { apiClient } from '@/shared/lib/api-client'
import type { AnalyticsSummary, ConversationRow, Period } from '../schemas/analytics-schemas'
import { OUTCOME_LABELS, REASON_LABELS, fmtDateTime } from '../lib/format'
import { type RefreshMs, useAnalyticsStore } from '../store/analytics-store'
import { fetchPrometheusSnapshot } from '../api/analytics-api'
import { Chip } from './panel'

const PERIODS: Period[] = ['1h', '6h', '24h', '7d', '30d']
const REFRESH_OPTIONS: { label: string; value: RefreshMs }[] = [
  { label: 'OFF', value: 0 },
  { label: '15S', value: 15000 },
  { label: '30S', value: 30000 },
  { label: '1M', value: 60000 },
]

const BASE_CHANNELS = ['all', 'web', 'rest', 'ws', 'whatsapp', 'slack', 'gmail', 'voice']

function toLocalInput(epochSec: number): string {
  const d = new Date(epochSec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AnalyticsHeader({
  summary,
  conversations,
  isFetching,
  onRefresh,
}: {
  summary?: AnalyticsSummary
  conversations?: ConversationRow[]
  isFetching: boolean
  onRefresh: () => void
}) {
  const {
    period,
    range,
    channel,
    tenantId,
    refreshMs,
    outcomeFilter,
    reasonFilter,
    setPeriod,
    setRange,
    setChannel,
    setTenantId,
    setRefreshMs,
    setOutcomeFilter,
    setReasonFilter,
    clearCrossFilters,
  } = useAnalyticsStore()

  const [showCustom, setShowCustom] = useState(false)
  const [fromStr, setFromStr] = useState(() => toLocalInput(Math.floor(Date.now() / 1000) - 3600 * 6))
  const [toStr, setToStr] = useState(() => toLocalInput(Math.floor(Date.now() / 1000)))
  const [seeding, setSeeding] = useState(false)

  const channels = Array.from(new Set([...BASE_CHANNELS, ...(summary?.dimensions.channels ?? [])]))
  const tenants = summary?.dimensions.tenants ?? ['default']

  const applyCustomRange = (e: React.FormEvent) => {
    e.preventDefault()
    const f = Math.floor(new Date(fromStr).getTime() / 1000)
    const t = Math.floor(new Date(toStr).getTime() / 1000)
    if (!Number.isFinite(f) || !Number.isFinite(t) || t <= f) {
      toast.error('Intervalo inválido: data final deve ser maior que a inicial.')
      return
    }
    setRange({ from: f, to: t })
    setShowCustom(false)
  }

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['section', 'key', 'metric', 'value'],
      ['kpi', 'conversations', 'count', String(summary?.conversations ?? 0)],
      ['kpi', 'volume', 'turns', String(summary?.volume ?? 0)],
      ['kpi', 'autonomous_rate', 'ratio', String(summary?.autonomous_rate ?? '')],
      ['kpi', 'handoff_rate', 'ratio', String(summary?.handoff_rate ?? '')],
      ['kpi', 'error_rate', 'ratio', String(summary?.error_rate ?? '')],
      ['kpi', 'latency_p50', 'seconds', String(summary?.latency.p50 ?? '')],
      ['kpi', 'latency_p95', 'seconds', String(summary?.latency.p95 ?? '')],
      ['kpi', 'latency_p99', 'seconds', String(summary?.latency.p99 ?? '')],
      ['kpi', 'rate_limited', 'count', String(summary?.health.rate_limited_total ?? 0)],
    ]
    for (const t of summary?.tools.top ?? []) {
      rows.push(['tool', t.tool, 'calls', String(t.calls)])
      rows.push(['tool', t.tool, 'error_rate', String(t.error_rate)])
      rows.push(['tool', t.tool, 'latency_p95', String(t.latency.p95 ?? '')])
    }
    for (const [reason, count] of Object.entries(summary?.handoffs.by_reason ?? {})) {
      rows.push(['handoff_reason', reason, 'count', String(count)])
    }
    for (const c of conversations ?? []) {
      rows.push([
        'conversation',
        c.session_id,
        `${c.channel}|${c.outcome}|turns=${c.turns}|tools=${c.tool_calls}`,
        String(c.duration_seconds),
      ])
    }
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-analytics-${period}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado com sucesso.')
  }

  const handleCopyProm = async () => {
    try {
      const snap = await fetchPrometheusSnapshot()
      await navigator.clipboard.writeText(snap || '# empty snapshot')
      toast.success('Snapshot Prometheus copiado para a área de transferência.')
    } catch {
      toast.error('Não foi possível copiar o snapshot Prometheus.')
    }
  }

  const handleSeedDemo = async () => {
    setSeeding(true)
    try {
      await apiClient.post('/api/analytics/_seed', undefined, { params: { hours: 24, per_hour: 35 } })
      toast.success('Tráfego sintético de demonstração gerado (24h).')
      onRefresh()
    } catch {
      toast.error('Endpoint de seed indisponível (apenas dev/test).')
    } finally {
      setSeeding(false)
    }
  }

  const hasCrossFilter = Boolean(outcomeFilter || reasonFilter || channel !== 'all' || tenantId || range)

  return (
    <header className="flex flex-col gap-3 border-b border-[#1C1C24] pb-4">
      {/* Top Row: Title + Operational Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B6B7C]">
            <span className="h-1.5 w-1.5 bg-[#D4FF00]" />
            <span>[COCKPIT SRE // OBSERVABILITY]</span>
            {summary && (
              <span className="text-[#9E9EB2]">
                JANELA {fmtDateTime(summary.window.start)} → {fmtDateTime(summary.window.end)} (STEP {summary.window.step_seconds}S)
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#F4F4F8] leading-none">
            ANALYTICS <span className="font-mono text-xl sm:text-3xl text-[#D4FF00]">/</span> AGENT BEHAVIOR
          </h1>
        </div>

        {/* Actions Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedDemo}
            disabled={seeding}
            title="Gerar telemetria sintética realista (dev/test)"
            className="gap-1.5 border-[#1C1C24] bg-[#0A0A0E] text-[10px]"
          >
            <Sparkles className="h-3 w-3 text-[#D4FF00]" />
            <span>POPULAR DEMO</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 border-[#1C1C24] bg-[#0A0A0E] text-[10px]"
          >
            <Download className="h-3 w-3" />
            <span>EXPORT CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyProm}
            className="gap-1.5 border-[#1C1C24] bg-[#0A0A0E] text-[10px]"
          >
            <Copy className="h-3 w-3" />
            <span>PROM SNAPSHOT</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="gap-1.5 text-[10px]"
          >
            <a href="http://localhost:3000" target="_blank" rel="noreferrer">
              <span>ABRIR GRAFANA</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Filter & Time Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[#1C1C24] bg-[#0A0A0E] px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center border border-[#1C1C24] bg-[#040405]">
            <span className="px-2 font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">PERÍODO</span>
            {PERIODS.map((p) => {
              const active = !range && period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 font-mono text-[10px] uppercase transition-colors ${
                    active ? 'bg-[#D4FF00] font-bold text-black' : 'text-[#9E9EB2] hover:text-[#F4F4F8]'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              className={`flex items-center gap-1 border-l border-[#1C1C24] px-2 py-1 font-mono text-[10px] uppercase ${
                range ? 'bg-[#D4FF00] font-bold text-black' : 'text-[#9E9EB2] hover:text-[#F4F4F8]'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>{range ? 'CUSTOM ●' : 'CUSTOM'}</span>
            </button>
          </div>

          {/* Channel Selector */}
          <div className="flex items-center border border-[#1C1C24] bg-[#040405]">
            <label htmlFor="analytics-channel-select" className="px-2 font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
              CANAL
            </label>
            <select
              id="analytics-channel-select"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="bg-[#040405] px-2 py-1 font-mono text-[10px] uppercase text-[#F4F4F8] focus:outline-none"
            >
              {channels.map((ch) => (
                <option key={ch} value={ch} className="bg-[#040405] text-[#F4F4F8]">
                  {ch.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Tenant Selector / Input */}
          <div className="flex items-center border border-[#1C1C24] bg-[#040405]">
            <label htmlFor="analytics-tenant-input" className="px-2 font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
              TENANT
            </label>
            <input
              id="analytics-tenant-input"
              list="analytics-tenants-datalist"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="ALL"
              className="w-28 bg-[#040405] px-2 py-1 font-mono text-[10px] text-[#F4F4F8] placeholder:text-[#6B6B7C] focus:outline-none"
            />
            <datalist id="analytics-tenants-datalist">
              {tenants.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Right: Refresh + Auto-refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#1C1C24] bg-[#040405]">
            <span className="px-2 font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">AUTO</span>
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRefreshMs(opt.value)}
                className={`px-2 py-1 font-mono text-[10px] uppercase ${
                  refreshMs === opt.value ? 'bg-[#D4FF00] font-bold text-black' : 'text-[#9E9EB2] hover:text-[#F4F4F8]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 border border-[#1C1C24] bg-[#040405] px-2.5 py-1 font-mono text-[10px] uppercase text-[#F4F4F8] hover:border-[#D4FF00] hover:text-[#D4FF00] disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin text-[#D4FF00]' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Custom Time Range Picker */}
      {showCustom && (
        <form onSubmit={applyCustomRange} className="flex flex-wrap items-center gap-2 border border-[#32323E] bg-[#0A0A0E] p-2.5 font-mono text-[10px]">
          <span className="text-[#9E9EB2] uppercase">INTERVALO ABSOLUTO:</span>
          <input
            type="datetime-local"
            value={fromStr}
            onChange={(e) => setFromStr(e.target.value)}
            className="border border-[#1C1C24] bg-[#040405] px-2 py-1 text-[#F4F4F8]"
          />
          <span className="text-[#6B6B7C]">→</span>
          <input
            type="datetime-local"
            value={toStr}
            onChange={(e) => setToStr(e.target.value)}
            className="border border-[#1C1C24] bg-[#040405] px-2 py-1 text-[#F4F4F8]"
          />
          <Button type="submit" size="sm" className="h-6 px-2.5 text-[10px]">
            APLICAR
          </Button>
          {range && (
            <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[10px]" onClick={() => setRange(null)}>
              LIMPAR ZOOM
            </Button>
          )}
        </form>
      )}

      {/* Active Cross-Filters Bar */}
      {hasCrossFilter && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          <span className="text-[#6B6B7C] uppercase tracking-wider">FILTROS ATIVOS:</span>
          {range && (
            <Chip active onClick={() => setRange(null)}>
              ZOOM: {fmtDateTime(range.from)} → {fmtDateTime(range.to)} ×
            </Chip>
          )}
          {channel !== 'all' && (
            <Chip active onClick={() => setChannel('all')}>
              CANAL: {channel} ×
            </Chip>
          )}
          {tenantId && (
            <Chip active onClick={() => setTenantId('')}>
              TENANT: {tenantId} ×
            </Chip>
          )}
          {outcomeFilter && (
            <Chip active onClick={() => setOutcomeFilter(null)}>
              OUTCOME: {OUTCOME_LABELS[outcomeFilter] ?? outcomeFilter} ×
            </Chip>
          )}
          {reasonFilter && (
            <Chip active onClick={() => setReasonFilter(null)}>
              MOTIVO: {REASON_LABELS[reasonFilter] ?? reasonFilter} ×
            </Chip>
          )}
          <button
            type="button"
            onClick={() => {
              clearCrossFilters()
              setTenantId('')
              setRange(null)
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[#9E9EB2] hover:text-[#D4FF00]"
          >
            <FilterX className="h-3 w-3" />
            <span>LIMPAR TUDO</span>
          </button>
        </div>
      )}
    </header>
  )
}

