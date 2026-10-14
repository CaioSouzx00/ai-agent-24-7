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
    <div className="border-t border-[#2B2B2B] bg-[#0D0D0D] p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder={
              isResolved
                ? '// ESTE CHAMADO JÁ FOI FINALIZADO'
                : 'Digite sua resposta para enviar diretamente ao cliente (Pressione Enter para enviar)...'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isResolved || isSending}
            className="flex-1 bg-[#000000]"
          />
          <Button
            type="submit"
            disabled={isResolved || isSending || !text.trim()}
            variant="default"
            size="sm"
            data-cursor
            data-cursor-label="enviar"
            className="gap-2 shrink-0 font-mono text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>ENVIAR RESPOSTA</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 font-mono text-xs">
          <div className="text-[#818181] text-[11px]">
            RESPONSÁVEL: <span className="text-[#EDEDED] font-bold uppercase">{operatorName}</span>
          </div>

          <div className="flex items-center gap-2">
            {ticket.status === 'open' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onClaim(operatorName)}
                disabled={isClaiming}
                data-cursor
                data-cursor-label="assumir"
                className="gap-1.5 text-xs text-[#C6F432] border-[#C6F432]/40 hover:bg-[#C6F432]/10"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>ASSUMIR ESTE ATENDIMENTO</span>
              </Button>
            )}

            {!isResolved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResolve}
                disabled={isResolving}
                data-cursor
                data-cursor-label="finalizar"
                className="gap-1.5 text-xs text-emerald-400 border-emerald-800/40 hover:bg-emerald-950/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>FINALIZAR CHAMADO</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
