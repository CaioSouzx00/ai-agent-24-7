import { Activity, ShieldAlert, Wrench, Users } from 'lucide-react'
import { StatCard } from '@/shared/ui'
import type { DashboardStats } from '../schemas/dashboard-schemas'

export interface KpiGridProps {
  stats?: DashboardStats
}

export function KpiGrid({ stats }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Processed Requests"
        value={stats ? stats.requestsTotal : '--'}
        hint="// 01: Total conversational turns executed through the reasoning engine"
        icon={<Activity className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
        trend="+14% /24H"
      />
      <StatCard
        title="Active Human Tickets"
        value={stats ? stats.activeTickets : '--'}
        hint="// 02: Conversations currently escalated to human triage"
        icon={<Users className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
      <StatCard
        title="Registered Tools"
        value={stats ? stats.registeredToolsCount : '--'}
        hint="// 03: Static deterministic + dynamic synthesized tools"
        icon={<Wrench className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
      <StatCard
        title="Rate Limit Blocks"
        value={stats ? stats.rateLimitExceededCount : '--'}
        hint="// 04: HTTP 429 and signature security blocks intercepted"
        icon={<ShieldAlert className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
    </div>
  )
}
