import { useState, useRef, useEffect } from 'react'
import { Terminal, Send, AlertTriangle, RefreshCw, Sparkles, Copy, Check, ArrowRight } from 'lucide-react'
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
      content: 'Autonomous neural agent online. Reasoning core primed. Ready for dispatch.',
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
      const errorText = err instanceof Error ? err.message : 'Inference pipeline failure.'
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36),
        role: 'system',
        content: `KERNEL ERROR: ${errorText}`,
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
        content: 'Session buffer purged. Memory state reset to default. Enter instruction.',
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
            <span>[03 // CONSOLE]</span>
            <span>AUTONOMOUS INFERENCE COCKPIT</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#EDEDED] leading-none">
            Agent Terminal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-1 font-mono text-xs">
            <span className="text-[#818181]">SESSION:</span>
            <span className="text-[#EDEDED] font-bold">{sessionId}</span>
            <button
              onClick={copySessionId}
              data-cursor
              data-cursor-label="copy"
              className="text-[#818181] hover:text-[#C6F432] ml-1 transition-colors"
              title="Copy session id"
            >
              {copiedSession ? <Check className="h-3 w-3 text-[#C6F432]" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetSession}
            data-cursor
            data-cursor-label="purge"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            <span>PURGE BUFFER</span>
          </Button>
        </div>
      </div>

      {/* Handoff Banner */}
      {handoffTriggered && (
        <div className="mt-4 border border-amber-600/40 bg-amber-950/20 p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>[HUMAN ESCALATION TRIGGERED]:</strong> Ticket registered in operator queue.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="open"
            className="border-amber-600/50 text-amber-300 hover:bg-amber-950/40 gap-1"
          >
            <a href="/handoff">
              OPEN TRIAGE QUEUE <ArrowRight className="h-3 w-3" />
            </a>
          </Button>
        </div>
      )}

      {/* Main Terminal Frame */}
      <div className="flex-1 my-6 flex flex-col border border-[#2B2B2B] bg-[#0D0D0D] overflow-hidden relative">
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
                      ? '// OPERATOR INPUT'
                      : isSystem
                        ? '// KERNEL DIAGNOSTIC'
                        : '// AGENT REASONING ENGINE'}
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
                    <div className="mt-3 pt-3 border-t border-[#2B2B2B] font-mono text-[11px] text-[#C6F432]">
                      [STATUS: AUTOMATIC HANDOFF INITIATED // TICKET DISPATCHED]
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="mr-auto border border-[#2B2B2B] bg-[#000000] p-4 font-mono text-xs text-[#818181] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-ping" />
              <span>[REASONING LOOP RUNNING // TOOL SYNTHESIS IN PROGRESS...]</span>
            </div>
          )}
        </div>

        {/* Presets Bar */}
        <div className="border-t border-[#1A1A1A] bg-[#000000] px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-mono text-[10px] uppercase text-[#818181] shrink-0">
            DISPATCH PRESETS:
          </span>
          <button
            onClick={() => sendQuickPrompt('I want to cancel my contract and speak to a manager.')}
            data-cursor
            data-cursor-label="preset"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [TEST HANDOFF TRIGGER]
          </button>
          <button
            onClick={() => sendQuickPrompt('List all active capabilities and registered tools.')}
            data-cursor
            data-cursor-label="preset"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [INSPECT TOOL REGISTRY]
          </button>
          <button
            onClick={() => sendQuickPrompt('Search for the latest machine learning benchmarks.')}
            data-cursor
            data-cursor-label="preset"
            className="font-mono text-[10px] border border-[#2B2B2B] bg-[#0D0D0D] px-2 py-0.5 text-[#A0A0A0] hover:text-[#EDEDED] hover:border-[#595959] transition-colors shrink-0"
          >
            [INVOKE WEB SEARCH]
          </button>
        </div>

        {/* Input Terminal Prompt */}
        <form
          onSubmit={handleSend}
          className="border-t border-[#2B2B2B] bg-[#0D0D0D] p-3 sm:p-4 flex items-center gap-3"
        >
          <span className="font-mono text-sm text-[#C6F432] pl-2 select-none">&gt;</span>
          <Input
            placeholder="Type instruction (e.g. 'Search for recent events', 'Trigger cancellation protocol')..."
            value={inputMessage}
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
            data-cursor-label="send"
            className="gap-2 shrink-0 font-mono text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>DISPATCH</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
