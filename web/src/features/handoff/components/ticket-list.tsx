import { Search, UserCheck } from 'lucide-react'
import { Badge, EmptyState, Input, Skeleton } from '@/shared/ui'
import { CHANNEL_BADGES, TICKET_STATUS_COLORS } from '@/shared/config/constants'
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
    <div className="flex h-full flex-col border-r border-border/80 bg-background/50">
      {/* Top filters */}
      <div className="flex flex-col gap-3 p-4 border-b border-border/80">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['', 'open', 'claimed', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onFilterChange(s)}
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition-all capitalize',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {s || 'all'}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-18 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No tickets"
            description={
              statusFilter ? `No tickets matching filter "${statusFilter}".` : 'No handoff tickets recorded.'
            }
            className="m-4"
          />
        ) : (
          filtered.map((ticket) => {
            const isSelected = selectedTicketId === ticket.id
            const lastMsg = ticket.messages.at(-1)
            const statusConfig = TICKET_STATUS_COLORS[ticket.status]
            const channelBadge = CHANNEL_BADGES[ticket.channel as keyof typeof CHANNEL_BADGES] || 'bg-slate-500/10'

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className={cn(
                  'cursor-pointer p-4 transition-all duration-150 hover:bg-accent/5',
                  isSelected && 'bg-accent/10 border-l-2 border-primary'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', channelBadge)}>
                      {ticket.channel}
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      #{ticket.id}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(ticket.created_at)}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                  {lastMsg ? truncate(lastMsg.content, 90) : 'No messages'}
                </p>

                <div className="mt-2.5 flex items-center justify-between">
                  <Badge variant="outline" className={cn('text-[10px] gap-1 px-2 py-0', statusConfig.bg)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                    {statusConfig.label}
                  </Badge>

                  {ticket.assignee && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <UserCheck className="h-3 w-3 text-indigo-400" />
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
