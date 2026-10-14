import { ExternalLink, Radio, RefreshCw } from 'lucide-react'
import { Badge, Button, ErrorState, Skeleton } from '@/shared/ui'
import { useDashboardMetrics } from '../api/use-dashboard-metrics'
import { KpiGrid } from './kpi-grid'
import { MetricsSnapshot } from './metrics-snapshot'

export function DashboardView() {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useDashboardMetrics()

  if (isError) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <ErrorState
          title="TELEMETRY FEED DISCONNECTED"
          message={error instanceof Error ? error.message : 'Could not fetch Prometheus telemetry data.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10 lg:p-16 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#2B2B2B] pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#818181] mb-2">
            <span>[01 // TELEMETRY]</span>
            <span>REAL-TIME PIPELINE METRICS</span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-normal tracking-tight text-[#EDEDED] leading-none">
            System Observability
          </h1>
          <p className="mt-3 font-sans text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
            Continuous telemetry and anomaly interception across all asynchronous message queues, 
            tool executions, and human intervention handoffs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-cursor
            data-cursor-label="sync"
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            <span>SYNC FEED</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="raw"
            className="gap-2"
          >
            <a href="/metrics" target="_blank" rel="noreferrer">
              RAW /METRICS <ExternalLink className="h-3 w-3" />
            </a>
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="grafana"
            className="gap-2"
          >
            <a href="http://localhost:3000" target="_blank" rel="noreferrer">
              GRAFANA UI <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[#818181]">
            // CORE TELEMETRY INDICES
          </span>
          <span className="font-mono text-[10px] text-[#C6F432]">
            [● LIVE STREAM ACTIVE]
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
            ))}
          </div>
        ) : (
          <KpiGrid stats={stats} />
        )}
      </div>

      {/* Metrics Snapshot */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[#818181]">
            // PROMETHEUS SCRAPE BUFFER
          </span>
          <span className="font-mono text-[10px] text-[#818181]">
            FORMAT: OPENMETRICS-TEXT/PLAIN
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
        ) : (
          <MetricsSnapshot
            rawText={stats?.rawMetricsText}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />
        )}
      </div>
    </div>
  )
}
