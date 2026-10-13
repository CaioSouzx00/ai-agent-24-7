import { useState } from 'react'
import { CheckCircle2, Send, UserCheck } from 'lucide-react'
import { Button, Input } from '@/shared/ui'
import { useAuthStore } from '@/shared/lib/auth-store'
import type { Ticket } from '../schemas/handoff-schemas'

export interface TicketReplyBarProps {
  ticket: Ticket
  onSendReply: (text: string, assignee: string) => void
  onClaim: (assignee: string) => void
  onResolve: () => void
  isSending?: boolean
  isClaiming?: boolean
  isResolving?: boolean
}

export function TicketReplyBar({
  ticket,
  onSendReply,
  onClaim,
  onResolve,
  isSending,
  isClaiming,
  isResolving,
}: TicketReplyBarProps) {
  const [text, setText] = useState('')
  const operatorName = useAuthStore((s) => s.operatorName)
  const isResolved = ticket.status === 'resolved'

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!text.trim() || isResolved || isSending) return
    onSendReply(text.trim(), operatorName)
    setText('')
  }

  return (
    <div className="border-t border-border/80 bg-background/80 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder={
              isResolved ? 'This ticket is resolved. Reopen to reply.' : 'Type your reply to the customer (Enter to send)...'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isResolved || isSending}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isResolved || isSending || !text.trim()}
            className="gap-2 shrink-0"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            Replying as: <span className="font-semibold text-foreground">{operatorName}</span>
          </div>

          <div className="flex items-center gap-2">
            {ticket.status === 'open' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onClaim(operatorName)}
                disabled={isClaiming}
                className="gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Claim Ticket
              </Button>
            )}

            {!isResolved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResolve}
                disabled={isResolving}
                className="gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolve Ticket
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
