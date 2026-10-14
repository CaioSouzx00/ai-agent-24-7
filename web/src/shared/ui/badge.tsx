import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-none border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-primary)]',
        secondary: 'border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)]',
        destructive: 'border-red-900 bg-red-950/40 text-red-400',
        outline: 'border-[var(--border-subtle)] text-[var(--text-secondary)] bg-transparent',
        success: 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]',
        warning: 'border-amber-700/50 bg-amber-950/30 text-amber-400',
        info: 'border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-primary)]',
        purple: 'border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text-primary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
