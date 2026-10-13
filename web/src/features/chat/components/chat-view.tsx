import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, Input } from '@/shared/ui'
import { sendChatMessage } from '../api/chat-api'
import type { ChatMessage } from '../schemas/chat-schemas'

export function ChatView() {
  const [sessionId, setSessionId] = useState(() => `session_${Math.random().toString(36).slice(2, 9)}`)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hello! I am your 24/7 autonomous AI assistant. How can I help you today?',
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
      const errorText = err instanceof Error ? err.message : 'Failed to reach agent.'
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36),
        role: 'system',
        content: `Error: ${errorText}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const resetSession = () => {
    setSessionId(`session_${Math.random().toString(36).slice(2, 9)}`)
    setMessages([
      {
        id: 'init',
        role: 'assistant',
        content: 'Session reset. What would you like to explore next?',
        timestamp: Date.now(),
      },
    ])
    setHandoffTriggered(false)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Agent Playground
            </h1>
            <Badge variant="purple" className="gap-1 text-xs">
              <Sparkles className="h-3 w-3" /> REST & LLM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test conversational turns, tool loops, intent detection, and handoff triggers live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/50 px-3 py-1.5 text-xs font-mono text-muted-foreground">
            Session: <span className="text-cyan-400 font-semibold">{sessionId}</span>
          </div>
          <Button variant="outline" size="sm" onClick={resetSession} className="gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> New Session
          </Button>
        </div>
      </div>

      {handoffTriggered && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Human Handoff triggered:</strong> An operator ticket was created and the bot is paused for this session.
            </span>
          </div>
          <Button variant="link" size="sm" asChild className="text-amber-300 underline font-semibold p-0 h-auto">
            <a href="/handoff">Open Console →</a>
          </Button>
        </div>
      )}

      {/* Message Feed */}
      <Card className="flex-1 my-4 flex flex-col overflow-hidden bg-background/40">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            const isSystem = m.role === 'system'

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : isSystem ? 'mx-auto' : 'mr-auto'
                }`}
              >
                {!isSystem && (
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                      isUser ? 'bg-primary text-primary-foreground' : 'bg-cyan-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-indigo-500/10'
                      : isSystem
                        ? 'bg-destructive/10 text-destructive border border-destructive/20 text-xs'
                        : 'bg-card border border-border/80 text-foreground rounded-tl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3 mr-auto items-center text-xs text-muted-foreground animate-pulse">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-border/80 bg-card px-4 py-2.5">
                Thinking and executing tools...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-border/80 bg-background/60 flex gap-2">
          <Input
            placeholder="Type your message to the agent (e.g. 'Search for recent news' or 'I need to cancel my contract')..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputMessage.trim()} className="gap-2 shrink-0">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      </Card>
    </div>
  )
}
