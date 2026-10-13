import { useEffect, useRef } from 'react'
import { Bot, User, UserCheck } from 'lucide-react'
import { Badge } from '@/shared/ui'
import { CHANNEL_BADGES, TICKET_STATUS_COLORS } from '@/shared/config/constants'
import { formatRelativeTime } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/utils'
import type { Ticket } from '../schemas/handoff-schemas'

export interface TicketChatProps {
  ticket: Ticket
}

export function TicketChat({ ticket }: TicketChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [ticket.messages])

  const statusConfig = TICKET_STATUS_COLORS[ticket.status]
  const channelBadge = CHANNEL_BADGES[ticket.channel as keyof typeof CHANNEL_BADGES] || 'bg-slate-500/10'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-background/60 p-4">
        <div className="flex items-center gap-3">
          <span className={cn('rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider', channelBadge)}>
            {ticket.channel}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">
                Ticket #{ticket.id}
              </h2>
              <Badge variant="outline" className={cn('text-[11px] gap-1 px-2 py-0', statusConfig.bg)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">Session: {ticket.session_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {ticket.reason && (
            <span className="rounded bg-muted/40 px-2.5 py-1 text-slate-300">
              Reason: {ticket.reason}
            </span>
          )}
          {ticket.assignee ? (
            <span className="flex items-center gap-1 font-medium text-indigo-400">
              <UserCheck className="h-3.5 w-3.5" /> Assigned to {ticket.assignee}
            </span>
          ) : (
            <span className="text-amber-400">Unassigned</span>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {ticket.messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages in this ticket.</p>
        ) : (
          ticket.messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            const isHuman = msg.role === 'human'
            const isAssistant = msg.role === 'assistant'

            return (
              <div
                key={index}
                className={cn('flex gap-3 max-w-[80%]', isUser ? 'mr-auto' : 'ml-auto flex-row-reverse')}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isUser
                      ? 'bg-muted text-muted-foreground'
                      : isHuman
                        ? 'bg-indigo-600 text-white'
                        : 'bg-cyan-600 text-white'
                  )}
                >
                  {isUser ? <User className="h-4 w-4" /> : isHuman ? <UserCheck className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed',
                    isUser
                      ? 'bg-muted/80 text-foreground rounded-tl-sm'
                      : isHuman
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-card border border-border/80 text-foreground rounded-tr-sm'
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 text-[10px] font-semibold uppercase tracking-wider',
                      isUser ? 'text-muted-foreground' : isHuman ? 'text-indigo-200' : 'text-cyan-400'
                    )}
                  >
                    {isUser ? 'Customer' : isHuman ? `Operator (${ticket.assignee || 'Human'})` : 'AI Agent'}
                  </div>
                  <div className="whitespace-pre-wrap word-break">{msg.content}</div>
                  {msg.created_at && (
                    <div className="mt-1 text-right text-[10px] opacity-70">
                      {formatRelativeTime(msg.created_at)}
                    </div>
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
