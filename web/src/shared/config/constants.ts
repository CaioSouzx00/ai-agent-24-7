export const APP_CONFIG = {
  name: 'AI Agent 24/7',
  version: '0.2.0',
  description: 'Enterprise Autonomous Conversational Platform',
}

export const POLLING_INTERVALS = {
  METRICS_MS: 5000,
  TICKETS_MS: 8000,
  HEALTH_MS: 15000,
}

export const TICKET_STATUS_COLORS = {
  open: {
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Open',
  },
  claimed: {
    bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    dot: 'bg-indigo-400',
    label: 'Claimed',
  },
  resolved: {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
    label: 'Resolved',
  },
} as const

export const CHANNEL_BADGES = {
  web: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  slack: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  whatsapp: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  temporal: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  voice: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
} as const
