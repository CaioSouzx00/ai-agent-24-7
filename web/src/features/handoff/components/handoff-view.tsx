import { useState } from 'react'
import { Skeleton } from '@/shared/ui'
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
      <div className="p-8 max-w-5xl mx-auto font-mono text-xs text-red-400">
        // FAILED TO QUERY HANDOFF QUEUE: {error instanceof Error ? error.message : 'Queue unreachable'}
        <button onClick={() => refetch()} className="mt-4 block border border-[#2B2B2B] px-3 py-1 text-[#EDEDED]">
          RETRY QUERY
        </button>
      </div>
    )
  }

  return (
    <div className="grid h-[calc(100vh-56px)] grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr] overflow-hidden bg-[#000000]">
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
      <div className="flex h-full flex-col bg-[#000000] relative">
        {selectedTicketId ? (
          isLoadingDetail && !activeTicket ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
              <Skeleton className="h-64 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
              <Skeleton className="h-14 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
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
            <div className="m-auto text-center font-mono text-xs text-[#818181] p-8">
              // TICKET DATA UNRESOLVED
            </div>
          )
        ) : (
          <div className="m-auto text-center font-mono text-xs text-[#818181] p-8 max-w-md">
            <span className="block text-sm text-[#EDEDED] font-syne uppercase tracking-wider mb-2">
              [NO CONVERSATION SELECTED]
            </span>
            <p className="leading-relaxed">
              Select an escalated ticket from the triage queue on the left to inspect customer context and initiate human takeover.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
