import { useState } from 'react'
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { useTickets, useTicketDetail } from '../api/use-tickets'
import { useTicketMutations } from '../api/use-ticket-mutations'
import type { TicketStatusFilter } from '../schemas/handoff-schemas'
import { TicketList } from './ticket-list'
import { TicketChat } from './ticket-chat'
import { TicketReplyBar } from './ticket-reply-bar'

export function HandoffView() {
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const { data: tickets = [], isLoading: isLoadingList, isError, error, refetch } = useTickets(statusFilter)
  const { data: selectedTicket, isLoading: isLoadingDetail } = useTicketDetail(selectedTicketId)
  const mutations = useTicketMutations(selectedTicketId)

  // Auto-select first ticket if none selected
  const activeTicket = selectedTicket || tickets.find((t) => t.id === selectedTicketId)

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load handoff queue"
          message={error instanceof Error ? error.message : 'Could not reach the /handoff/tickets endpoint.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr] overflow-hidden">
      {/* Sidebar List */}
      <TicketList
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={(id) => setSelectedTicketId(id)}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoadingList}
      />

      {/* Main Conversation Pane */}
      <div className="flex h-full flex-col bg-background">
        {selectedTicketId ? (
          isLoadingDetail && !activeTicket ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : activeTicket ? (
            <>
              <div className="flex-1 overflow-hidden">
                <TicketChat ticket={activeTicket} />
              </div>
              <TicketReplyBar
                ticket={activeTicket}
                onSendReply={(text, assignee) => mutations.reply.mutate({ text, assignee })}
                onClaim={(assignee) => mutations.claim.mutate({ assignee })}
                onResolve={() => mutations.resolve.mutate()}
                isSending={mutations.reply.isPending}
                isClaiming={mutations.claim.isPending}
                isResolving={mutations.resolve.isPending}
              />
            </>
          ) : (
            <EmptyState
              title="Ticket not found"
              description="The selected ticket could not be loaded."
              className="m-auto"
            />
          )
        ) : (
          <EmptyState
            title="Select a conversation"
            description="Choose a ticket from the left panel to review messages and take over the interaction."
            className="m-auto max-w-md"
          />
        )}
      </div>
    </div>
  )
}
