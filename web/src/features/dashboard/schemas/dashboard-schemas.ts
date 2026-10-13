import { z } from 'zod'

export const DashboardStatsSchema = z.object({
  requestsTotal: z.number().default(0),
  activeTickets: z.number().default(0),
  registeredToolsCount: z.number().default(0),
  rateLimitExceededCount: z.number().default(0),
  rawMetricsText: z.string().default(''),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>
