import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { claimTicket, replyToTicket, resolveTicket } from './handoff-api'
import type { ClaimInput, ReplyInput } from '../schemas/handoff-schemas'

export function useTicketMutations(ticketId: string | null) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['handoff', 'tickets'] })
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: ['handoff', 'ticket', ticketId] })
    }
  }

  const claimMutation = useMutation({
    mutationFn: (input: ClaimInput) => {
      if (!ticketId) throw new Error('No ticket selected')
      return claimTicket(ticketId, input)
    },
    onSuccess: () => {
      toast.success('Ticket claimed successfully')
      invalidate()
    },
    onError: (err: Error) => {
      toast.error(`Failed to claim ticket: ${err.message}`)
    },
  })

  const replyMutation = useMutation({
    mutationFn: (input: ReplyInput) => {
      if (!ticketId) throw new Error('No ticket selected')
      return replyToTicket(ticketId, input)
    },
    onSuccess: () => {
      toast.success('Reply sent to customer channel')
      invalidate()
    },
    onError: (err: Error) => {
      toast.error(`Failed to deliver reply: ${err.message}`)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!ticketId) throw new Error('No ticket selected')
      return resolveTicket(ticketId)
    },
    onSuccess: () => {
      toast.success('Ticket resolved. AI agent resumed.')
      invalidate()
    },
    onError: (err: Error) => {
      toast.error(`Failed to resolve ticket: ${err.message}`)
    },
  })

  return {
    claim: claimMutation,
    reply: replyMutation,
    resolve: resolveMutation,
  }
}
