import { apiClient } from '@/shared/lib/api-client'
import type { Ticket, ClaimInput, ReplyInput } from '../schemas/handoff-schemas'

export async function fetchTickets(status?: string): Promise<Ticket[]> {
  return apiClient.get<Ticket[]>('/handoff/tickets', {
    params: status ? { status } : undefined,
  })
}

export async function fetchTicketById(ticketId: string): Promise<Ticket> {
  return apiClient.get<Ticket>(`/handoff/tickets/${ticketId}`)
}

export async function claimTicket(ticketId: string, input: ClaimInput): Promise<Ticket> {
  return apiClient.post<Ticket>(`/handoff/tickets/${ticketId}/claim`, input)
}

export async function replyToTicket(ticketId: string, input: ReplyInput): Promise<{ ok: boolean }> {
  return apiClient.post<{ ok: boolean }>(`/handoff/tickets/${ticketId}/reply`, input)
}

export async function resolveTicket(ticketId: string): Promise<Ticket> {
  return apiClient.post<Ticket>(`/handoff/tickets/${ticketId}/resolve`)
}
