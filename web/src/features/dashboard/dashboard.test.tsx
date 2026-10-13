import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiGrid } from './components/kpi-grid'

describe('Dashboard KpiGrid Component', () => {
  it('renders all four KPI cards with fallback when data is undefined', () => {
    render(<KpiGrid stats={undefined} />)
    expect(screen.getByText('Processed Requests')).toBeInTheDocument()
    expect(screen.getByText('Active Human Tickets')).toBeInTheDocument()
    expect(screen.getByText('Registered Tools')).toBeInTheDocument()
    expect(screen.getByText('Rate Limit Blocks')).toBeInTheDocument()
  })

  it('renders populated metric values properly', () => {
    render(
      <KpiGrid
        stats={{
          requestsTotal: 342,
          activeTickets: 5,
          registeredToolsCount: 9,
          rateLimitExceededCount: 2,
          rawMetricsText: '',
        }}
      />
    )
    expect(screen.getByText('342')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
