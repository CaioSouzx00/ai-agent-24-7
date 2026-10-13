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
  valueColor = 'text-foreground',
  className,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'glass-panel relative overflow-hidden rounded-xl p-5 transition-shadow hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30',
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{title}</span>
        {icon && <div className="text-muted-foreground/80">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className={cn('font-mono text-3xl font-bold tracking-tight', valueColor)}>{value}</div>
        {trend && <span className="text-xs font-medium text-emerald-400">{trend}</span>}
      </div>

      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  )
}
