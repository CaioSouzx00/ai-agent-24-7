import { z } from 'zod'

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'human', 'system']),
  content: z.string(),
  created_at: z.number().optional(),
})

export const TicketSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  channel: z.string(),
  status: z.enum(['open', 'claimed', 'resolved']),
  assignee: z.string().nullable().optional(),
  reason: z.string().optional().default(''),
  created_at: z.number(),
  messages: z.array(MessageSchema).default([]),
  meta: z.record(z.unknown()).default({}),
})

export const ClaimInputSchema = z.object({
  assignee: z.string().min(1, 'Operator name is required'),
})

export const ReplyInputSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty'),
  assignee: z.string().optional(),
})

export type Ticket = z.infer<typeof TicketSchema>
export type Message = z.infer<typeof MessageSchema>
export type ClaimInput = z.infer<typeof ClaimInputSchema>
export type ReplyInput = z.infer<typeof ReplyInputSchema>
export type TicketStatusFilter = '' | 'open' | 'claimed' | 'resolved'
