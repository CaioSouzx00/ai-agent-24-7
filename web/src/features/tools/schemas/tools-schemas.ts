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
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(64, 'O nome deve ter no máximo 64 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Apenas letras, números, hífens e sublinhados são permitidos'),
  description: z
    .string()
    .trim()
    .min(5, 'A descrição deve ter pelo menos 5 caracteres')
    .max(500, 'A descrição deve ter no máximo 500 caracteres'),
  url: z
    .string()
    .trim()
    .url('Informe uma URL HTTP ou HTTPS válida')
    .max(2048, 'A URL deve ter no máximo 2048 caracteres'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
})

export type ToolItem = z.infer<typeof ToolItemSchema>
export type CreateDynamicToolInput = z.infer<typeof CreateDynamicToolSchema>
