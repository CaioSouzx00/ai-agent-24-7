import { Activity, ShieldAlert, Wrench, Users } from 'lucide-react'
import { StatCard } from '@/shared/ui'
import type { DashboardStats } from '../schemas/dashboard-schemas'

export interface KpiGridProps {
  stats?: DashboardStats
}

export function KpiGrid({ stats }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Processed Requests"
        value={stats ? stats.requestsTotal : '--'}
        hint="Total conversational turns executed"
        icon={<Activity className="h-4 w-4 text-indigo-400" />}
        valueColor="text-indigo-400"
      />
      <StatCard
        title="Active Human Tickets"
        value={stats ? stats.activeTickets : '--'}
        hint="Conversations escalated to operator"
        icon={<Users className="h-4 w-4 text-rose-400" />}
        valueColor="text-rose-400"
      />
      <StatCard
        title="Registered Tools"
        value={stats ? stats.registeredToolsCount : '--'}
        hint="Core & runtime synthesized tools"
        icon={<Wrench className="h-4 w-4 text-cyan-400" />}
        valueColor="text-cyan-400"
      />
      <StatCard
        title="Rate Limit Blocks"
        value={stats ? stats.rateLimitExceededCount : '--'}
        hint="HTTP 429 requests intercepted"
        icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
        valueColor="text-amber-400"
      />
    </div>
  )
}
