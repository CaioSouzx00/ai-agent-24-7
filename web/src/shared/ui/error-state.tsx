import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { cn } from '../lib/utils'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected network error occurred while communicating with the server.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="font-display text-base font-semibold text-foreground mb-1">{title}</h4>
      <p className="max-w-md text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}
