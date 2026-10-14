import { useEffect, useRef } from 'react'
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

  return (
    <div className="flex h-full flex-col bg-[#000000]">
      {/* Editorial Ticket Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2B2B2B] bg-[#0D0D0D] p-4 sm:px-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase font-bold text-[#C6F432] border border-[#2B2B2B] px-1.5 py-0.5">
              {ticket.channel}
            </span>
            <h2 className="font-syne text-lg font-bold uppercase text-[#EDEDED]">
              Ticket #{ticket.id}
            </h2>
            <span
              className={cn(
                'font-mono text-[10px] px-1.5 py-0.5 border uppercase',
                ticket.status === 'open'
                  ? 'border-amber-600/50 text-amber-400 bg-amber-950/20'
                  : ticket.status === 'claimed'
                    ? 'border-[#C6F432]/50 text-[#C6F432] bg-[#C6F432]/10'
                    : 'border-[#595959] text-[#818181]'
              )}
            >
              [{ticket.status}]
            </span>
          </div>
          <p className="font-mono text-[11px] text-[#818181] mt-1">
            SESSION REF: {ticket.session_id}
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-[#818181]">
          {ticket.reason && (
            <span className="border border-[#2B2B2B] px-2 py-0.5 text-[#EDEDED]">
              REASON: {ticket.reason}
            </span>
          )}
          {ticket.assignee ? (
            <span className="text-[#C6F432]">
              OPERATOR: {ticket.assignee}
            </span>
          ) : (
            <span className="text-amber-400">[UNCLAIMED]</span>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {ticket.messages.length === 0 ? (
          <div className="text-center font-mono text-xs text-[#818181] py-12">
            // NO MESSAGE TRANSCRIPT LOGGED FOR THIS TICKET
          </div>
        ) : (
          ticket.messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            const isHuman = msg.role === 'human'
            const isAssistant = msg.role === 'assistant'

            return (
              <div
                key={index}
                className={cn(
                  'flex flex-col max-w-2xl',
                  isUser ? 'mr-auto items-start' : 'ml-auto items-end'
                )}
              >
                {/* Speaker Label */}
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#818181] mb-1.5 uppercase">
                  <span>
                    {isUser
                      ? '// CUSTOMER INPUT'
                      : isHuman
                        ? `// OPERATOR OVERRIDE (${ticket.assignee || 'Human'})`
                        : '// AGENT ATTEMPT'}
                  </span>
                  {msg.created_at && (
                    <>
                      <span>•</span>
                      <span>{formatRelativeTime(msg.created_at)}</span>
                    </>
                  )}
                </div>

                {/* Message Body */}
                <div
                  className={cn(
                    'border p-4 text-sm leading-relaxed',
                    isUser
                      ? 'border-[#2B2B2B] bg-[#0D0D0D] text-[#EDEDED]'
                      : isHuman
                        ? 'border-[#C6F432]/60 bg-[#1A1A1A] text-[#EDEDED]'
                        : 'border-[#3F3F3F] bg-[#000000] text-[#A0A0A0]'
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
