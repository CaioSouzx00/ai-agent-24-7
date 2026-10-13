import { useQuery } from '@tanstack/react-query'
import { POLLING_INTERVALS } from '@/shared/config/constants'
import { fetchTickets, fetchTicketById } from './handoff-api'
import type { TicketStatusFilter } from '../schemas/handoff-schemas'

export function useTickets(statusFilter: TicketStatusFilter) {
  return useQuery({
    queryKey: ['handoff', 'tickets', statusFilter],
    queryFn: () => fetchTickets(statusFilter || undefined),
    refetchInterval: POLLING_INTERVALS.TICKETS_MS,
    staleTime: 4000,
  })
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ['handoff', 'ticket', ticketId],
    queryFn: () => fetchTicketById(ticketId!),
    enabled: Boolean(ticketId),
    refetchInterval: ticketId ? 5000 : false,
  })
}
