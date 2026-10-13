import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TicketList } from './components/ticket-list'
import { TicketChat } from './components/ticket-chat'
import type { Ticket } from './schemas/handoff-schemas'

describe('Handoff Feature Components', () => {
  const mockTickets: Ticket[] = [
    {
      id: 'abc12345',
      session_id: 'session_test_999',
      channel: 'web',
      status: 'open',
      assignee: null,
      reason: 'cancellation request',
      created_at: Math.floor(Date.now() / 1000),
      messages: [
        { role: 'user', content: 'I need to cancel my service right now.' },
        { role: 'assistant', content: 'Let me transfer you to a human representative.' },
      ],
      meta: {},
    },
  ]

  it('renders ticket list items with status and preview', () => {
    render(
      <TicketList
        tickets={mockTickets}
        selectedTicketId={null}
        onSelectTicket={() => {}}
        statusFilter="open"
        onFilterChange={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
      />
    )
    expect(screen.getByText('#abc12345')).toBeInTheDocument()
    expect(screen.getByText('web')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders ticket chat messages with user and assistant roles', () => {
    render(<TicketChat ticket={mockTickets[0]} />)
    expect(screen.getByText('Ticket #abc12345')).toBeInTheDocument()
    expect(screen.getByText('I need to cancel my service right now.')).toBeInTheDocument()
    expect(screen.getByText('Let me transfer you to a human representative.')).toBeInTheDocument()
  })
})
