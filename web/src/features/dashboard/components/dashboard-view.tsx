import { ExternalLink, Radio } from 'lucide-react'
import { Badge, Button, ErrorState, Skeleton } from '@/shared/ui'
import { useDashboardMetrics } from '../api/use-dashboard-metrics'
import { KpiGrid } from './kpi-grid'
import { MetricsSnapshot } from './metrics-snapshot'

export function DashboardView() {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useDashboardMetrics()

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Telemetry Feed Error"
          message={error instanceof Error ? error.message : 'Could not fetch Prometheus telemetry data.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Operations & Metrics
            </h1>
            <Badge variant="success" className="gap-1.5 py-1">
              <Radio className="h-3 w-3 animate-pulse" />
              Live Telemetry
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Continuous real-time observability across conversational channels and worker pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
            <a href="/metrics" target="_blank" rel="noreferrer">
              Raw Prometheus <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button variant="default" size="sm" asChild className="gap-2 text-xs shadow-indigo-500/20">
            <a href="http://localhost:3000" target="_blank" rel="noreferrer">
              Grafana Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <KpiGrid stats={stats} />
      )}

      {/* Metrics Snapshot Card */}
      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <MetricsSnapshot
          rawText={stats?.rawMetricsText}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  )
}
