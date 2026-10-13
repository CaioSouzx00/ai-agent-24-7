import { z } from 'zod'

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().default(() => Date.now()),
  handoff: z.boolean().optional(),
})

export const ChatInputSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  sessionId: z.string(),
  channel: z.string().default('web'),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type ChatInput = z.infer<typeof ChatInputSchema>
