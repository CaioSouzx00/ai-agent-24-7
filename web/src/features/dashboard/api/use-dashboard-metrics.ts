import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVALS } from '@/shared/config/constants'
import { fetchDashboardStats } from './dashboard-api'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: POLLING_INTERVALS.METRICS_MS,
    staleTime: 3000,
  })
}
