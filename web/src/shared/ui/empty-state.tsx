import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '../lib/utils'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title = 'No items found',
  description = 'There is currently no data to display.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground mb-4">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h4 className="font-display text-base font-semibold text-foreground mb-1">{title}</h4>
      <p className="max-w-sm text-sm text-muted-foreground mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
