import { useState } from 'react'
import { HelpCircle, UserCheck } from 'lucide-react'
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
        // FALHA AO CONECTAR COM A FILA DE ATENDIMENTO: {error instanceof Error ? error.message : 'Fila indisponível'}
        <button onClick={() => refetch()} className="mt-4 block border border-[#2B2B2B] px-3 py-1 text-[#EDEDED]">
          TENTAR NOVAMENTE
        </button>
      </div>
    )
  }

  return (
    <div className="grid h-[calc(100vh-56px)] grid-cols-1 md:grid-cols-[360px_1fr] lg:grid-cols-[400px_1fr] overflow-hidden bg-[#000000]">
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
              // DADOS DO CHAMADO NÃO PUDERAM SER CARREGADOS
            </div>
          )
        ) : (
          <div className="m-auto p-8 max-w-lg text-center font-sans space-y-4">
            <div className="w-12 h-12 mx-auto rounded-none border border-[#2B2B2B] bg-[#0D0D0D] flex items-center justify-center text-[#C6F432]">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-syne uppercase font-bold text-[#EDEDED]">
              Fila de Atendimento Humano
            </h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Nenhuma conversa selecionada no momento. Escolha um chamado na lista à esquerda para ler o que o cliente disse e assumir o atendimento.
            </p>

            <div className="border border-[#2B2B2B] bg-[#0D0D0D] p-4 text-left font-mono text-xs text-[#818181] space-y-2">
              <div className="flex items-center gap-1.5 text-[#EDEDED] font-bold">
                <HelpCircle className="h-3.5 w-3.5 text-[#C6F432]" />
                <span>COMO FUNCIONA ESTE FLUXO?</span>
              </div>
              <p>1. O cliente pediu cancelamento ou solicitou atendente no chat.</p>
              <p>2. O robô pausou as respostas automáticas para não incomodar o cliente.</p>
              <p>3. Você clica em <strong>[ASSUMIR ATENDIMENTO]</strong> e digita sua resposta.</p>
              <p>4. Ao terminar, clique em <strong>[FINALIZAR CHAMADO]</strong>.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
