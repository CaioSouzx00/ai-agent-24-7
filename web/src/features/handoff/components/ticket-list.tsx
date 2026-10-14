import { Search, UserCheck } from 'lucide-react'
import { Input, Skeleton } from '@/shared/ui'
import { formatRelativeTime, truncate } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/utils'
import type { Ticket, TicketStatusFilter } from '../schemas/handoff-schemas'

export interface TicketListProps {
  tickets: Ticket[]
  selectedTicketId: string | null
  onSelectTicket: (id: string) => void
  statusFilter: TicketStatusFilter
  onFilterChange: (status: TicketStatusFilter) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  isLoading?: boolean
}

export function TicketList({
  tickets,
  selectedTicketId,
  onSelectTicket,
  statusFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  isLoading,
}: TicketListProps) {
  const filtered = tickets.filter((t) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.id.toLowerCase().includes(q) ||
      t.session_id.toLowerCase().includes(q) ||
      t.channel.toLowerCase().includes(q) ||
      (t.messages.at(-1)?.content || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex h-full flex-col border-r border-[#2B2B2B] bg-[#000000]">
      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 p-4 border-b border-[#2B2B2B]">
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#818181] uppercase tracking-wider">
          <span>// TRIAGE QUEUE</span>
          <span>({filtered.length} ITEMS)</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#818181]" />
          <Input
            placeholder="Search tickets, sessions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-[#0D0D0D]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto text-xs">
          {(['', 'open', 'claimed', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onFilterChange(s)}
              data-cursor
              data-cursor-label="filter"
              className={cn(
                'px-2.5 py-1 font-mono text-[11px] uppercase transition-colors',
                statusFilter === s
                  ? 'bg-[#EDEDED] text-black font-bold'
                  : 'bg-[#0D0D0D] border border-[#2B2B2B] text-[#818181] hover:text-[#EDEDED]'
              )}
            >
              {s ? `[${s}]` : '[ALL]'}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#818181]">
            // NO ACTIVE TICKETS IN THIS FILTER
          </div>
        ) : (
          filtered.map((ticket) => {
            const isSelected = selectedTicketId === ticket.id
            const lastMsg = ticket.messages.at(-1)

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                data-cursor
                data-cursor-label="inspect"
                className={cn(
                  'cursor-pointer p-4 transition-colors',
                  isSelected
                    ? 'bg-[#1A1A1A] border-l-2 border-[#C6F432]'
                    : 'bg-[#000000] hover:bg-[#0D0D0D]'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#C6F432] border border-[#2B2B2B] px-1">
                      {ticket.channel}
                    </span>
                    <span className="font-mono text-xs text-[#EDEDED] font-bold">
                      #{ticket.id}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#818181]">
                    {formatRelativeTime(ticket.created_at)}
                  </span>
                </div>

                <p className="mt-2 font-sans text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">
                  {lastMsg ? truncate(lastMsg.content, 90) : 'No recorded messages'}
                </p>

                <div className="mt-3 flex items-center justify-between font-mono text-[10px]">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 border uppercase font-mono text-[10px]',
                      ticket.status === 'open'
                        ? 'border-amber-600/50 text-amber-400 bg-amber-950/20'
                        : ticket.status === 'claimed'
                          ? 'border-[#C6F432]/50 text-[#C6F432] bg-[#C6F432]/10'
                          : 'border-[#595959] text-[#818181]'
                    )}
                  >
                    {ticket.status === 'open' ? 'Open' : ticket.status === 'claimed' ? 'Claimed' : 'Resolved'}
                  </span>

                  {ticket.assignee && (
                    <span className="flex items-center gap-1 text-[#818181]">
                      <UserCheck className="h-3 w-3 text-[#C6F432]" />
                      {ticket.assignee}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
