import { Terminal, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/ui'

export interface MetricsSnapshotProps {
  rawText?: string
  isFetching?: boolean
  onRefresh?: () => void
}

export function MetricsSnapshot({ rawText, isFetching, onRefresh }: MetricsSnapshotProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <CardTitle className="text-base">Prometheus Metrics Snapshot</CardTitle>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg border border-border/80 bg-black/60 p-4 font-mono text-xs text-slate-300">
          <pre className="h-[320px] overflow-auto whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30">
            {rawText ? rawText.slice(0, 4000) : 'No metrics data available yet.'}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
