import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
  trend?: string
  valueColor?: string
  className?: string
}

export function StatCard({
  title,
  value,
  hint,
  icon,
  trend,
  valueColor = 'text-[var(--text-primary)]',
  className,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      data-cursor
      data-cursor-label="inspect"
      className={cn(
        'relative bg-[var(--surface-1)] border border-[var(--border-subtle)] p-6 transition-colors hover:border-[var(--border-strong)] rounded-none group',
        className
      )}
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        <span>{title}</span>
        {icon && <div className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{icon}</div>}
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <div className={cn('font-display text-4xl sm:text-5xl font-normal tracking-tight text-[var(--text-primary)]', valueColor)}>
          {value}
        </div>
        {trend && <span className="font-mono text-[10px] text-[var(--accent)]">{trend}</span>}
      </div>

      {hint && <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)] leading-relaxed">{hint}</p>}

      {/* Technical corner ticks */}
      <span className="absolute top-0 right-0 text-[10px] font-mono text-[var(--border-subtle)] leading-none p-1 pointer-events-none">+</span>
      <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[var(--border-subtle)] leading-none p-1 pointer-events-none">+</span>
    </motion.div>
  )
}
