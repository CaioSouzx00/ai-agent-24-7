import { useState, useRef, useEffect } from 'react'
import { Send, AlertTriangle, RefreshCw, Copy, Check, ArrowRight, HelpCircle, MessageSquare, Bot, UserCheck } from 'lucide-react'
import { Button, Input } from '@/shared/ui'
import { sendChatMessage } from '../api/chat-api'
import type { ChatMessage } from '../schemas/chat-schemas'

export function ChatView() {
  const [sessionId, setSessionId] = useState(() => `sess_${Math.random().toString(36).slice(2, 9)}`)
  const [inputMessage, setInputMessage] = useState('')
  const [copiedSession, setCopiedSession] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Olá! Sou o seu Agente Autônomo 24/7. Estou pronto para responder dúvidas, executar ferramentas ou acionar um atendente humano se necessário. Como posso ajudar você hoje?',
      timestamp: Date.now(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [handoffTriggered, setHandoffTriggered] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userText = inputMessage.trim()
    setInputMessage('')

    const userMsg: ChatMessage = {
      id: Math.random().toString(36),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await sendChatMessage(sessionId, userText)
      const botMsg: ChatMessage = {
        id: Math.random().toString(36),
        role: 'assistant',
        content: res.response,
        timestamp: Date.now(),
        handoff: res.handoff,
      }
      setMessages((prev) => [...prev, botMsg])
      if (res.handoff) {
        setHandoffTriggered(true)
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Falha na comunicação com o robô.'
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36),
        role: 'system',
        content: `ERRO DE PROCESSAMENTO: ${errorText}. Verifique se o servidor backend está ligado.`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const resetSession = () => {
    setSessionId(`sess_${Math.random().toString(36).slice(2, 9)}`)
    setMessages([
      {
        id: 'init',
        role: 'assistant',
        content: 'Conversa reiniciada! A memória temporária desta sessão foi limpa. O que gostaria de testar agora?',
        timestamp: Date.now(),
      },
    ])
    setHandoffTriggered(false)
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
    setCopiedSession(true)
    setTimeout(() => setCopiedSession(false), 2000)
  }

  const sendQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-w-7xl mx-auto p-4 sm:p-8 lg:p-10 font-sans">
      {/* Editorial Cockpit Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2B2B2B] pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#818181] mb-2">
            <span>[03 // CONSOLE DE TESTES]</span>
            <span>ÁREA DE CONVERSA COM O ROBÔ</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#EDEDED] leading-none">
            Chat com o Agente
          </h1>
          <p className="mt-2 text-sm text-[#A0A0A0]">
            Converse diretamente com o robô para ver como ele responde seus clientes em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-1 font-mono text-xs">
            <span className="text-[#818181]">SESSÃO:</span>
            <span className="text-[#EDEDED] font-bold">{sessionId}</span>
            <button
              onClick={copySessionId}
              data-cursor
              data-cursor-label="copiar"
              className="text-[#818181] hover:text-[#C6F432] ml-1 transition-colors"
              title="Copiar ID da sessão"
            >
              {copiedSession ? <Check className="h-3 w-3 text-[#C6F432]" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetSession}
            data-cursor
            data-cursor-label="limpar"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            <span>NOVA CONVERSA</span>
          </Button>
        </div>
      </div>

      {/* Caixa de Ajuda para o Usuário Leigo */}
      <div className="mt-4 border border-[#2B2B2B] bg-[#0D0D0D] p-4 text-xs text-[#A0A0A0] leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-[#C6F432] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#EDEDED] block">Como testar esta tela?</strong>
            <span>
              Digite qualquer dúvida na barra abaixo como se fosse um cliente, ou clique em um dos exemplos rápidos (como <em>&quot;Testar Cancelamento&quot;</em>) para ver o robô transferir a conversa para a aba <strong>Atendimento Humano</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Transbordo Humano */}
      {handoffTriggered && (
        <div className="mt-3 border border-amber-600/50 bg-amber-950/20 p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>[TRANSFERÊNCIA HUMANA ACIONADA]:</strong> O robô detectou que o cliente precisa de atenção humana e pausou as respostas automáticas.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="abrir"
            className="border-amber-600/60 text-amber-300 hover:bg-amber-950/40 gap-1"
          >
            <a href="/handoff">
              VER NA FILA DE ATENDIMENTO <ArrowRight className="h-3 w-3" />
            </a>
          </Button>
        </div>
      )}

      {/* Main Terminal Frame */}
      <div className="flex-1 my-4 flex flex-col border border-[#2B2B2B] bg-[#0D0D0D] overflow-hidden relative">
        <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>
        <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            const isSystem = m.role === 'system'

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-3xl ${
                  isUser ? 'ml-auto items-end' : isSystem ? 'mx-auto items-center' : 'mr-auto items-start'
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#818181] mb-1.5 uppercase tracking-wider">
                  <span>
                    {isUser
                      ? '// VOCÊ (MENSAGEM DO CLIENTE)'
                      : isSystem
                        ? '// AVISO DO SISTEMA'
                        : '// RESPOSTA DO AGENTE IA'}
                  </span>
                  <span>•</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                </div>

                {/* Content Block */}
                <div
                  className={`border p-5 text-sm leading-relaxed ${
                    isUser
                      ? 'border-[#3F3F3F] bg-[#1A1A1A] text-[#EDEDED]'
                      : isSystem
                        ? 'border-red-900 bg-red-950/30 text-red-300 font-mono text-xs'
                        : 'border-[#2B2B2B] bg-[#000000] text-[#EDEDED]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {m.handoff && (
                    <div className="mt-3 pt-3 border-t border-[#2B2B2B] font-mono text-[11px] text-[#C6F432] flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>[STATUS: CHAMADO CRIADO PARA ATENDENTE HUMANO]</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="mr-auto border border-[#2B2B2B] bg-[#000000] p-4 font-mono text-xs text-[#818181] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-ping" />
              <span>[ROBÔ PENSANDO E CONSULTANDO FERRAMENTAS...]</span>
            </div>
          )}
        </div>

        {/* Exemplos Rápidos de Teste (Presets) */}
        <div className="border-t border-[#1A1A1A] bg-[#000000] px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-mono text-[10px] uppercase text-[#818181] shrink-0">
            TESTES RÁPIDOS:
          </span>
          <button
            onClick={() => sendQuickPrompt('Quero cancelar meu contrato e falar com um atendente agora.')}
            data-cursor
            data-cursor-label="exemplo"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [1. TESTAR TRANSFERÊNCIA HUMANA]
          </button>
          <button
            onClick={() => sendQuickPrompt('Quais são as ferramentas e tarefas que você consegue executar?')}
            data-cursor
            data-cursor-label="exemplo"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [2. LISTAR HABILIDADES DO ROBÔ]
          </button>
          <button
            onClick={() => sendQuickPrompt('Pesquise na internet as principais notícias de tecnologia de hoje.')}
            data-cursor
            data-cursor-label="exemplo"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [3. PEDIR BUSCA NA WEB]
          </button>
        </div>

        {/* Input Terminal Prompt */}
        <form
          onSubmit={handleSend}
          className="border-t border-[#2B2B2B] bg-[#0D0D0D] p-3 sm:p-4 flex items-center gap-3"
        >
          <span className="font-mono text-sm text-[#C6F432] pl-2 select-none">&gt;</span>
          <Input
            placeholder="Digite uma mensagem para o robô (ex: 'Quero tirar uma dúvida sobre o plano', 'Quero cancelar')..."
            value={inputMessage}
            maxLength={4000}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none text-[#EDEDED] font-mono text-xs focus-visible:border-none focus-visible:ring-0 p-0 h-auto"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            variant="default"
            size="sm"
            data-cursor
            data-cursor-label="enviar"
            className="gap-2 shrink-0 font-mono text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>ENVIAR</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
