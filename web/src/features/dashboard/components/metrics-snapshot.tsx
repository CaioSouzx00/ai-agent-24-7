import { Terminal, RefreshCw, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui'

export interface MetricsSnapshotProps {
  rawText?: string
  isFetching?: boolean
  onRefresh?: () => void
}

export function MetricsSnapshot({ rawText, isFetching, onRefresh }: MetricsSnapshotProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!rawText) return
    navigator.clipboard.writeText(rawText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative border border-[#2B2B2B] bg-[#0D0D0D] p-6 text-[#EDEDED]">
      <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
      <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2B2B2B] pb-4 mb-4">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-[#C6F432]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#EDEDED] font-bold">
            Telemetry Feed Buffer [raw-stream]
          </span>
          <span className="font-mono text-[10px] text-[#818181] border border-[#2B2B2B] px-1.5 py-0.5">
            BUFFER: {rawText ? `${(rawText.length / 1024).toFixed(1)} KB` : 'EMPTY'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!rawText}
            data-cursor
            data-cursor-label="copy"
            className="gap-1.5 text-xs text-[#818181] hover:text-[#EDEDED]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#C6F432]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              data-cursor
              data-cursor-label="refresh"
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </Button>
          )}
        </div>
      </div>

      <div className="relative border border-[#1A1A1A] bg-[#000000] p-4 font-mono text-xs text-[#A0A0A0]">
        <pre className="h-[360px] overflow-auto whitespace-pre-wrap leading-relaxed selection:bg-[#C6F432] selection:text-black">
          {rawText ? rawText.slice(0, 5000) : '// No metrics received. Ensure FastAPI daemon is running on port 8080.'}
        </pre>
      </div>

      <div className="mt-3 flex justify-between items-center font-mono text-[10px] text-[#818181]">
        <span>SCRAPE PROTOCOL: HTTP/1.1 GET /METRICS</span>
        <span>SECURITY: LOCALHOST WHITELIST</span>
      </div>
    </div>
  )
}
