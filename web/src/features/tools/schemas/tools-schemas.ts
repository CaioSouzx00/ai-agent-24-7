import { z } from 'zod'

export const ToolItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  isDynamic: z.boolean().default(false),
  url: z.string().optional(),
})

export const CreateDynamicToolSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must have at least 2 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens and underscores allowed'),
  description: z.string().min(5, 'Description is required'),
  url: z.string().url('Must be a valid HTTP/HTTPS URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
})

export type ToolItem = z.infer<typeof ToolItemSchema>
export type CreateDynamicToolInput = z.infer<typeof CreateDynamicToolSchema>
