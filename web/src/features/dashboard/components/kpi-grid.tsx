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
        hint="Conversas Atendidas: Total de turnos e mensagens que o robô processou."
        icon={<Activity className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
        trend="+14% /24h"
      />
      <StatCard
        title="Active Human Tickets"
        value={stats ? stats.activeTickets : '--'}
        hint="Chamados Humanos: Clientes que pediram atendente ou querem cancelar."
        icon={<Users className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
      <StatCard
        title="Registered Tools"
        value={stats ? stats.registeredToolsCount : '--'}
        hint="Habilidades Ativas: Funções e superpoderes que o robô sabe executar."
        icon={<Wrench className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
      <StatCard
        title="Rate Limit Blocks"
        value={stats ? stats.rateLimitExceededCount : '--'}
        hint="Bloqueios de Segurança: Mensagens abusivas ou em excesso bloqueadas."
        icon={<ShieldAlert className="h-4 w-4" />}
        valueColor="text-[#EDEDED]"
      />
    </div>
  )
}
