import { useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/shared/ui'
import {
  useAnalyticsConversations,
  useAnalyticsSummary,
  useAnalyticsTickets,
  useAnalyticsTimeseries,
} from '../api/use-analytics'
import { C, fmtCompact, fmtDuration, fmtPct } from '../lib/format'
import { useAnalyticsStore } from '../store/analytics-store'
import { AnalyticsHeader } from './analytics-header'
import {
  HandoffReasonsChart,
  OutcomesChart,
  ToolsPerConversationChart,
  TopToolsChart,
} from './behavior-charts'
import {
  DegradationList,
  LlmStats,
  MemoryTiers,
  NodeDurationChart,
} from './health-panels'
import { KpiStrip, KpiStripSkeleton } from './kpi-strip'
import { Chip, Panel } from './panel'
import { ConversationsTable, TicketsTable } from './tables'
import { TimeSeriesChart, mergeSeries, pivotTimeseries } from './timeseries-chart'
import { ToolDrawer } from './tool-drawer'

export function AnalyticsView() {
  const qc = useQueryClient()
  const {
    channel,
    outcomeFilter,
    reasonFilter,
    setChannel,
    setRange,
    setOutcomeFilter,
    setReasonFilter,
    setSelectedTool,
  } = useAnalyticsStore()

  const summaryQ = useAnalyticsSummary()
  const reqByChannelQ = useAnalyticsTimeseries('requests', 'channel')
  const handoffRateQ = useAnalyticsTimeseries('handoff_rate')
  const autoRateQ = useAnalyticsTimeseries('autonomous_rate')
  const p50Q = useAnalyticsTimeseries('latency_p50')
  const p95Q = useAnalyticsTimeseries('latency_p95')
  const p99Q = useAnalyticsTimeseries('latency_p99')
  const queueWaitQ = useAnalyticsTimeseries('queue_wait')
  const llmLatQ = useAnalyticsTimeseries('llm_latency_p95', 'model')
  const convQ = useAnalyticsConversations(50, 0)
  const ticketsQ = useAnalyticsTickets()

  const summary = summaryQ.data
  const spanSeconds = summary ? summary.window.end - summary.window.start : 86400

  const handleRefreshAll = () => {
    void qc.invalidateQueries({ queryKey: ['analytics'] })
  }

  const handleZoom = (from: number, to: number) => {
    if (to - from >= 60) {
      setRange({ from: Math.floor(from), to: Math.ceil(to) })
    }
  }

  if (summaryQ.isError) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <ErrorState
          title="FALHA AO CARREGAR TELEMETRIA DE COMPORTAMENTO"
          message={
            summaryQ.error instanceof Error
              ? summaryQ.error.message
              : 'Não foi possível consultar /api/analytics/summary.'
          }
          onRetry={handleRefreshAll}
        />
      </div>
    )
  }

  // Row 2 series preparation
  const reqPivot = pivotTimeseries(reqByChannelQ.data, 'channel', 'requests')
  const ratesRows = mergeSeries({
    handoff_rate: handoffRateQ.data,
    autonomous_rate: autoRateQ.data,
  })
  const latencyRows = mergeSeries({
    p50: p50Q.data,
    p95: p95Q.data,
    p99: p99Q.data,
  })
  const queueWaitPivot = pivotTimeseries(queueWaitQ.data, undefined, 'wait')
  const llmLatPivot = pivotTimeseries(llmLatQ.data, 'model', 'p95')

  const openCount = ticketsQ.data?.by_status?.open ?? 0
  const claimedCount = ticketsQ.data?.by_status?.claimed ?? 0
  const resolvedCount = ticketsQ.data?.by_status?.resolved ?? 0
  const activeTicketsTotal = openCount + claimedCount

  return (
    <div className="min-h-screen bg-[#040405] text-[#F4F4F8] px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3">
        {/* Header & Global Controls */}
        <AnalyticsHeader
          summary={summary}
          conversations={convQ.data?.items}
          isFetching={summaryQ.isFetching}
          onRefresh={handleRefreshAll}
        />

        {/* Row 1 — KPI Strip */}
        {summaryQ.isLoading || !summary ? (
          <KpiStripSkeleton />
        ) : (
          <KpiStrip data={summary} openTickets={openCount} />
        )}

        {/* Row 2 — Séries Temporais Principais */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Panel
            title="01 // VOLUME DE REQUESTS POR CANAL"
            source="GET /api/analytics/timeseries?metric=requests&group_by=channel · Prom: sum by (channel)(rate(agent_requests_total[5m]))"
            isLoading={reqByChannelQ.isLoading}
            isEmpty={!reqPivot.rows.length || (summary?.volume ?? 0) === 0}
          >
            <TimeSeriesChart
              data={reqPivot.rows}
              keys={reqPivot.keys}
              kind="stacked"
              format={(v) => fmtCompact(v)}
              spanSeconds={spanSeconds}
              onZoom={handleZoom}
              onSeriesFilter={(ch) => setChannel(channel === ch ? 'all' : ch)}
              showTotal
            />
          </Panel>

          <Panel
            title="02 // TAXA DE HANDOFF % VS AUTONOMIA %"
            source="GET /api/analytics/timeseries?metric=handoff_rate · Prom: sum(rate(agent_conversation_turns_total{outcome='handoff'}[5m])) / sum(rate(agent_conversation_turns_total[5m]))"
            isLoading={handoffRateQ.isLoading || autoRateQ.isLoading}
            isEmpty={!ratesRows.length || (summary?.agent_turns ?? 0) === 0}
          >
            <TimeSeriesChart
              data={ratesRows}
              keys={['autonomous_rate', 'handoff_rate']}
              kind="line"
              format={(v) => fmtPct(v)}
              spanSeconds={spanSeconds}
              yDomain={[0, 1]}
              labels={{ autonomous_rate: 'AUTÔNOMO %', handoff_rate: 'HANDOFF %' }}
              colors={{ autonomous_rate: C.accent, handoff_rate: C.warn }}
              reference={{ y: 0.25, label: 'ALERTA HANDOFF 25%', color: C.error }}
              onZoom={handleZoom}
            />
          </Panel>

          <Panel
            title="03 // LATÊNCIA DE TURNO P50 / P95 / P99"
            source="GET /api/analytics/timeseries?metric=latency_p50|p95|p99 · Prom: histogram_quantile(0.95, sum by (le)(rate(agent_request_duration_seconds_bucket[5m])))"
            isLoading={p50Q.isLoading || p95Q.isLoading || p99Q.isLoading}
            isEmpty={!latencyRows.length || (summary?.agent_turns ?? 0) === 0}
          >
            <TimeSeriesChart
              data={latencyRows}
              keys={['p50', 'p95', 'p99']}
              kind="line"
              format={(v) => fmtDuration(v)}
              spanSeconds={spanSeconds}
              labels={{ p50: 'P50', p95: 'P95', p99: 'P99' }}
              colors={{ p50: C.cyan, p95: C.accent, p99: C.error }}
              reference={{ y: 5, label: 'SLO 5s', color: C.warn }}
              onZoom={handleZoom}
            />
          </Panel>
        </div>

        {/* Row 3 — Comportamento do Agente */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Panel
            title="04 // OUTCOMES POR TURNO"
            source="agent_conversation_turns_total{outcome} · clique para filtrar conversas"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary || summary.volume === 0}
          >
            {summary && (
              <OutcomesChart
                outcomes={summary.outcomes}
                active={outcomeFilter}
                onSelect={setOutcomeFilter}
              />
            )}
          </Panel>

          <Panel
            title="05 // TOP TOOLS (VOLUME & ERROR RATE)"
            source="agent_tool_calls_total & agent_tool_duration_seconds · clique na barra para drill-down"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary || summary.tools.top.length === 0}
            emptyLabel="NENHUMA TOOL EXECUTADA NA JANELA"
          >
            {summary && (
              <TopToolsChart
                tools={summary.tools.top}
                onSelect={(tool) => setSelectedTool(tool)}
              />
            )}
          </Panel>

          <Panel
            title="06 // HANDOFFS POR MOTIVO"
            source="agent_handoffs_total{reason} · clique para filtrar tickets e conversas"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary}
          >
            {summary && (
              <HandoffReasonsChart
                byReason={summary.handoffs.by_reason}
                active={reasonFilter}
                onSelect={setReasonFilter}
              />
            )}
          </Panel>

          <Panel
            title="07 // TOOLS POR CONVERSA (DISTRIBUIÇÃO)"
            source="agent_tools_per_conversation_bucket · quantas tools o agente aciona por sessão"
            isLoading={convQ.isLoading}
            isEmpty={!convQ.data || convQ.data.total === 0}
          >
            {convQ.data && (
              <ToolsPerConversationChart dist={convQ.data.tools_per_conversation} />
            )}
          </Panel>
        </div>

        {/* Row 4 — Handoff & Operação */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Active Tickets Gauge + Queue Wait Timeseries */}
          <Panel
            title="08 // FILA HUMANA & ESPERA ATÉ CLAIM"
            source="agent_tickets_active · agent_tickets_by_status · agent_handoff_wait_seconds"
            className="lg:col-span-5"
            isLoading={ticketsQ.isLoading && queueWaitQ.isLoading}
          >
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-px border border-[#1C1C24] bg-[#1C1C24]">
                <div className="bg-[#040405] p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
                    ATIVOS AGORA
                  </div>
                  <div
                    className="font-syne text-2xl font-bold tabular-nums"
                    style={{ color: activeTicketsTotal > 0 ? C.warn : C.accent }}
                  >
                    {activeTicketsTotal}
                  </div>
                  <div className="font-mono text-[9px] text-[#6B6B7C]">
                    open {openCount} · claimed {claimedCount}
                  </div>
                </div>
                <div className="bg-[#040405] p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
                    RESOLVIDOS
                  </div>
                  <div className="font-syne text-2xl font-bold tabular-nums text-[#F4F4F8]">
                    {resolvedCount}
                  </div>
                  <div className="font-mono text-[9px] text-[#6B6B7C]">no store</div>
                </div>
                <div className="bg-[#040405] p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
                    ESPERA P95
                  </div>
                  <div className="font-syne text-xl font-bold tabular-nums text-[#F4F4F8]">
                    {fmtDuration(summary?.handoffs.p95_wait_seconds)}
                  </div>
                  <div className="font-mono text-[9px] text-[#6B6B7C]">
                    avg {fmtDuration(summary?.handoffs.avg_wait_seconds)}
                  </div>
                </div>
                <div className="bg-[#040405] p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#6B6B7C]">
                    RESOLUÇÃO AVG
                  </div>
                  <div className="font-syne text-xl font-bold tabular-nums text-[#F4F4F8]">
                    {fmtDuration(summary?.handoffs.avg_resolution_seconds)}
                  </div>
                  <div className="font-mono text-[9px] text-[#6B6B7C]">
                    mais antigo {fmtDuration(ticketsQ.data?.oldest_open_wait_seconds)}
                  </div>
                </div>
              </div>

              <TimeSeriesChart
                data={queueWaitPivot.rows}
                keys={['wait']}
                kind="area"
                height={155}
                format={(v) => fmtDuration(v)}
                spanSeconds={spanSeconds}
                labels={{ wait: 'ESPERA MÉDIA (S)' }}
                colors={{ wait: C.warn }}
                onZoom={handleZoom}
              />
            </div>
          </Panel>

          {/* Recent Tickets Table */}
          <Panel
            title="09 // TICKETS DE HANDOFF RECENTES"
            source="GET /api/analytics/tickets"
            className="lg:col-span-7"
            isLoading={ticketsQ.isLoading}
            actions={
              reasonFilter ? (
                <Chip active onClick={() => setReasonFilter(null)}>
                  MOTIVO: {reasonFilter} ×
                </Chip>
              ) : undefined
            }
          >
            <TicketsTable rows={ticketsQ.data?.items ?? []} reasonFilter={reasonFilter} />
          </Panel>
        </div>

        {/* Row 4B — Conversas Recentes */}
        <Panel
          title={`10 // CONVERSAS RECENTES (${convQ.data?.total ?? 0})`}
          source="GET /api/analytics/conversations · sessões agregadas com tools acionadas e desfecho"
          isLoading={convQ.isLoading}
          actions={
            <div className="flex items-center gap-1">
              {(['autonomous_resolved', 'handoff', 'error', 'active'] as const).map((st) => (
                <Chip
                  key={st}
                  active={outcomeFilter === st}
                  onClick={() => setOutcomeFilter(outcomeFilter === st ? null : st)}
                >
                  {st === 'autonomous_resolved' ? 'AUTÔNOMO' : st.toUpperCase()}
                </Chip>
              ))}
            </div>
          }
        >
          <ConversationsTable
            rows={convQ.data?.items ?? []}
            reasonFilter={reasonFilter}
            onToolClick={(t) => setSelectedTool(t)}
          />
        </Panel>

        {/* Row 5 — Saúde Técnica */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Panel
            title="11 // SAÚDE LLM (CHAMADAS, LATÊNCIA P95 & TOKENS)"
            source="agent_llm_calls_total · agent_llm_latency_seconds · agent_llm_tokens_total"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary}
          >
            {summary && (
              <div className="flex flex-col gap-3">
                <LlmStats llm={summary.llm} />
                {llmLatPivot.rows.length > 0 && (
                  <TimeSeriesChart
                    data={llmLatPivot.rows}
                    keys={llmLatPivot.keys}
                    kind="line"
                    height={125}
                    format={(v) => fmtDuration(v)}
                    spanSeconds={spanSeconds}
                    onZoom={handleZoom}
                  />
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="12 // MEMÓRIA & CONTEXTO POR TIER"
            source="agent_memory_retrieval_seconds{tier} · agent_memory_hits_total{tier}"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary || Object.keys(summary.health.memory).length === 0}
            emptyLabel="SEM LEITURAS DE MEMÓRIA NA JANELA"
          >
            {summary && <MemoryTiers memory={summary.health.memory} />}
          </Panel>

          <Panel
            title="13 // DEGRADAÇÃO, RATE-LIMIT & SEGURANÇA"
            source="agent_fallback_mode_total · agent_ratelimit_exceeded_total · agent_webhook_signature_fail_total · agent_ssrf_blocked_total"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary}
          >
            {summary && <DegradationList health={summary.health} />}
          </Panel>

          <Panel
            title="14 // DURAÇÃO POR NÓ DO GRAFO LANGGRAPH (P95)"
            source="agent_graph_node_duration_seconds{node}"
            isLoading={summaryQ.isLoading}
            isEmpty={!summary || Object.keys(summary.health.graph_nodes).length === 0}
            emptyLabel="NENHUM NÓ EXECUTADO NA JANELA"
          >
            {summary && <NodeDurationChart nodes={summary.health.graph_nodes} />}
          </Panel>
        </div>
      </div>

      {/* Tool Drill-Down Drawer */}
      <ToolDrawer />
    </div>
  )
}

