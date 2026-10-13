import { apiClient } from '@/shared/lib/api-client'
import type { DashboardStats } from '../schemas/dashboard-schemas'

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [metricsText, tickets, toolsText] = await Promise.all([
    apiClient.get<string>('/metrics', { responseType: 'text' }).catch(() => ''),
    apiClient.get<unknown[]>('/handoff/tickets', { params: { status: 'open' } }).catch(() => []),
    apiClient.get<string>('/tools', { responseType: 'text' }).catch(() => ''),
  ])

  // Parse total requests counter from Prometheus
  let requestsTotal = 0
  const reqMatches = metricsText.matchAll(/agent_requests_total\{.*?\}\s+([0-9.]+)/g)
  for (const m of reqMatches) {
    requestsTotal += parseFloat(m[1]) || 0
  }

  // Parse rate limits counter from Prometheus
  let rateLimitExceededCount = 0
  const rlMatches = metricsText.matchAll(/agent_ratelimit_exceeded_total\{.*?\}\s+([0-9.]+)/g)
  for (const m of rlMatches) {
    rateLimitExceededCount += parseFloat(m[1]) || 0
  }

  // Count tools from markdown output lines
  const toolLines = toolsText.split('\n').filter((l) => l.trim().startsWith('- **'))

  return {
    requestsTotal: Math.round(requestsTotal),
    activeTickets: Array.isArray(tickets) ? tickets.length : 0,
    registeredToolsCount: toolLines.length,
    rateLimitExceededCount: Math.round(rateLimitExceededCount),
    rawMetricsText: metricsText,
  }
}
