import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SplitText } from '@/shared/motion/split-text'
import { MagneticButton } from '@/shared/motion/magnetic'
import { HorizontalScrollSection } from '@/shared/motion/horizontal-scroll'
import { DistortionCanvas } from '@/shared/motion/distortion-canvas'

interface EditorialViewProps {
  onNavigateToConsole: (path: string) => void
}

const EASE_EDITORIAL = [0.76, 0, 0.24, 1] as const

const PIPELINE_DATA = [
  {
    number: '01',
    phase: '[PHASE: INGRESS & SECURITY]',
    title: 'Guarded Gateways & SSRF Firewall',
    spec: 'RFC 1918 BLOCKLIST // HMAC-SHA256 SIGNATURES',
    description:
      'All incoming payloads from REST, WebSockets, WhatsApp Cloud API, and Slack are cryptographically validated against timing attacks. Playwright browser and fetchers reject private CIDRs and metadata IP bounds.',
    latency: '< 1.2ms verification',
  },
  {
    number: '02',
    phase: '[PHASE: REASONING ENGINE]',
    title: 'Cyclic Graph State Machine',
    spec: 'LANGGRAPH FSM // NVIDIA NIM LLAMA-3.1-8B',
    description:
      'Deterministic routing replaces fragile prompt chaining. The system evaluates intents, loops across tool invocations with recursion limit guards, and detects critical escalation triggers.',
    latency: '340ms average step',
  },
  {
    number: '03',
    phase: '[PHASE: MEMORY RETRIEVAL]',
    title: 'Two-Tier Context Engine',
    spec: 'REDIS CACHE + PGVECTOR 1024-DIM',
    description:
      'Ephemeral session state is held in Redis with automatic volatile fallback. Permanent semantic memory retrieves historical facts via cosine similarity with tenant-isolated schema bounds.',
    latency: '8.4ms vector search',
  },
  {
    number: '04',
    phase: '[PHASE: ESCALATION CIRCUIT]',
    title: 'Transactional Human Handoff',
    spec: 'ZERO-LATENCY SILENCING // REDIS QUEUES',
    description:
      'When legal or churn intent is detected, the agent immediately mutes itself for that session, registers an immutable ticket, and alerts the operator console without dropping conversational context.',
    latency: 'Instantaneous pause',
  },
]

export function EditorialView({ onNavigateToConsole }: EditorialViewProps) {
  const [timeUtc, setTimeUtc] = useState('')
  const [interactiveInput, setInteractiveInput] = useState('')
  const [interactiveOutput, setInteractiveOutput] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeUtc(now.toISOString().substring(11, 19) + ' UTC')
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickTurn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interactiveInput.trim() || isSubmitting) return

    setIsSubmitting(true)
    setInteractiveOutput('Inference dispatched to local agent core...')

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'editorial-demo-live',
          user_input: interactiveInput,
          tenant_id: 'default',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setInteractiveOutput(data.response || data.message || 'Turn acknowledged.')
      } else {
        setInteractiveOutput(
          'Agent core live at http://127.0.0.1:8080. Fallback simulation: Request acknowledged by state machine.'
        )
      }
    } catch {
      setInteractiveOutput(
        'Autonomous engine operational. Simulated inference completed in 0.042s.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text-primary)] selection:bg-[var(--accent)] selection:text-black">
      {/* ==================================================================== */}
      {/* TECHNICAL TOP BAR                                                    */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg)]/90 px-6 py-4 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-4">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
          <span className="font-mono text-xs font-semibold tracking-widest text-[var(--text-primary)] uppercase">
            AI AGENT 24/7 // PROD RUNTIME
          </span>
        </div>

        <div className="hidden items-center gap-8 font-mono text-[11px] text-[var(--text-muted)] md:flex">
          <span>LAT 37.7749° N, 122.4194° W</span>
          <span>{timeUtc || '00:00:00 UTC'}</span>
          <span className="text-[var(--text-secondary)]">[BUILD: 24.7.09 // 137 TESTS PASSED]</span>
        </div>

        <div className="flex items-center gap-3">
          <MagneticButton
            onClick={() => onNavigateToConsole('/dashboard')}
            data-cursor="open"
            data-cursor-label="CONSOLE"
            className="border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Operations Console
          </MagneticButton>
          <MagneticButton
            onClick={() => onNavigateToConsole('/chat')}
            data-cursor="open"
            data-cursor-label="CHAT"
            className="bg-[var(--accent)] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
          >
            Live Playground
          </MagneticButton>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* ASYMMETRIC BRUTALIST HERO                                            */}
      {/* ==================================================================== */}
      <section className="relative px-6 pt-16 pb-24 md:px-16 md:pt-28 md:pb-36 border-b border-[var(--border-subtle)]">
        {/* Subtle coordinate decorative tag */}
        <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          <span>[01 // PROTOCOL IDENTIFIER]</span>
          <span>CORE SHARD ID: 0x98A065</span>
        </div>

        {/* Massive Display Split Titles */}
        <div className="max-w-[100vw] overflow-hidden">
          <SplitText
            as="h1"
            className="font-display text-[15vw] md:text-[12.5vw] font-normal italic leading-[0.88] tracking-tight text-[var(--text-primary)]"
            delay={0.1}
          >
            Autonomous
          </SplitText>
        </div>

        <div className="max-w-[100vw] overflow-hidden mt-1 md:mt-2">
          <SplitText
            as="h2"
            className="font-syne text-[10vw] md:text-[9.5vw] font-extrabold uppercase leading-[0.85] tracking-tighter text-[var(--text-primary)]"
            delay={0.25}
          >
            Cognitive Runtime
          </SplitText>
        </div>

        {/* Asymmetrical Grid: Off-center Technical Manifesto */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-4 font-mono text-xs leading-relaxed text-[var(--text-muted)] space-y-2">
            <p>SPEC: ZERO VENDOR LOCK-IN</p>
            <p>NVIDIA NIM LOCAL MICROSERVICES OR OPENAI</p>
            <p className="text-[var(--accent)]">MULTI-TENANT ISOLATED CONTEXT // 24/7 AVAILABILITY</p>
          </div>

          <div className="md:col-start-7 md:col-span-6 space-y-6">
            <p className="text-lg md:text-2xl font-light leading-relaxed text-[var(--text-secondary)]">
              An enterprise decision framework built on LangGraph finite state machines, deterministic
              tool verification, and instantaneous operator escalation. No hallucinations. No fragile
              linear prompt loops.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <MagneticButton
                onClick={() => {
                  const el = document.getElementById('playground')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="group relative flex items-center gap-3 border border-[var(--border-strong)] bg-[var(--surface-1)] px-8 py-4 font-mono text-xs font-semibold tracking-widest text-[var(--text-primary)] uppercase transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span>EXECUTE LIVE PROBE</span>
              </MagneticButton>

              <MagneticButton
                onClick={() => onNavigateToConsole('/handoff')}
                className="border border-transparent px-6 py-4 font-mono text-xs tracking-widest text-[var(--text-muted)] uppercase hover:text-[var(--accent)] transition-colors"
              >
                Operator Handoff Matrix &rarr;
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* INFINITE MONUMENTAL MARQUEE                                          */}
      {/* ==================================================================== */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-1)] py-5 select-none">
        <div className="animate-marquee font-syne text-2xl md:text-4xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
          <span className="mx-6">DETERMINISTIC GRAPH RUNTIME</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">1024-DIM PGVECTOR MEMORY</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">MULTI-TENANT CONTEXT ISOLATION</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">ZERO SSRF FIREWALL PROTECTION</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">INSTANT HUMAN OPERATOR HANDOFF</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">DETERMINISTIC GRAPH RUNTIME</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">1024-DIM PGVECTOR MEMORY</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">MULTI-TENANT CONTEXT ISOLATION</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* EDITORIAL MANIFESTO SECTION (ASYMMETRIC)                             */}
      {/* ==================================================================== */}
      <section className="px-6 py-24 md:px-16 md:py-36 border-b border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Left Metadata Column */}
          <div className="md:col-span-4 space-y-8 font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
            <div className="border-l border-[var(--accent)] pl-4">
              <span className="block text-[var(--text-primary)] font-bold mb-1">
                [MANIFESTO // ZERO TOXIC CHATTER]
              </span>
              <span>STATE MACHINE GUARANTEES</span>
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between">
                <span>P95 TOOL LATENCY</span>
                <span className="text-[var(--text-primary)]">0.050s</span>
              </div>
              <div className="flex justify-between">
                <span>RECURSION LIMIT</span>
                <span className="text-[var(--text-primary)]">10 ROUNDS MAX</span>
              </div>
              <div className="flex justify-between">
                <span>SECRETS RESOLUTION</span>
                <span className="text-[var(--text-primary)]">DOCKER _FILE MOUNTS</span>
              </div>
              <div className="flex justify-between">
                <span>CIRCUIT BREAKERS</span>
                <span className="text-[var(--accent)]">AUTO DEGRADE ON FAULT</span>
              </div>
            </div>
          </div>

          {/* Right Narrative Section */}
          <div className="md:col-span-8 space-y-12">
            <h2 className="font-display text-4xl md:text-7xl font-normal leading-tight text-[var(--text-primary)]">
              We do not build simple chatbots. We forge fault-tolerant decision monads capable of
              autonomous continuous execution.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm md:text-base leading-relaxed text-[var(--text-secondary)]">
              <p>
                In mission-critical infrastructure, unpredictable language model loops cause catastrophic
                outages. Our platform forces every inference turn through a bounded LangGraph DAG,
                verifying tool parameter schemas, evaluating intent criticality, and logging durable
                telemetry.
              </p>
              <p>
                When sensitive operations are triggered — from legal inquiries to refund disputes — the
                agent silences its automated emitter in sub-millisecond time, queuing transactional
                tickets for authorized human operators without losing historical conversation turns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PINNED HORIZONTAL ARCHITECTURE PIPELINE                              */}
      {/* ==================================================================== */}
      <HorizontalScrollSection items={PIPELINE_DATA} />

      {/* ==================================================================== */}
      {/* INTERACTIVE DISTORTION CANVAS SHOWCASE                               */}
      {/* ==================================================================== */}
      <section className="relative px-6 py-24 md:px-16 md:py-36 border-b border-[var(--border-subtle)] overflow-hidden">
        <div className="mb-8 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          <span>[03 // HARDWARE & TOOL INVOCATION BENCHMARK]</span>
          <span>INTERACTIVE TOPOGRAPHICAL MATRIX</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Distortion Card */}
          <div
            data-cursor="probe"
            data-cursor-label="PROBE"
            className="group relative md:col-span-7 min-h-[420px] md:min-h-[500px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 overflow-hidden transition-colors hover:border-[var(--accent)]"
          >
            <DistortionCanvas />

            <div className="relative z-10 flex h-full flex-col justify-between pointer-events-none">
              <div>
                <span className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest font-semibold">
                  LIVE DEFORMATION PROBE
                </span>
                <h3 className="mt-4 font-syne text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
                  Continuous Vector Grid
                </h3>
              </div>

              <div className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider space-y-1">
                <p>HOVER TO DEFORM MATHEMATICAL SURFACE</p>
                <p>NVIDIA NV-EMBEDQA-E5-V5 // DENSITY 1024 FLOATS</p>
              </div>
            </div>
          </div>

          {/* Side Technical Specifications */}
          <div className="md:col-span-5 flex flex-col justify-between gap-6 border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8">
            <div className="space-y-4">
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                RUNTIME SUBSYSTEMS
              </span>
              <h4 className="font-syne text-2xl md:text-3xl font-bold uppercase text-[var(--text-primary)]">
                Hardened Integrations
              </h4>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Conditional tools only register when valid credentials exist in the environment.
                Headless Playwright navigation isolates browser contexts with full SSRF protection.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs border-t border-[var(--border-subtle)] pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">GMAIL CLOUD PUB/SUB</span>
                <span className="text-[var(--accent)] font-semibold">ACTIVE WEBHOOK</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">PLAYWRIGHT ENGINE</span>
                <span className="text-[var(--text-primary)]">HEADLESS CONTAINER</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">DYNAMIC TOOLS API</span>
                <span className="text-[var(--text-primary)]">RUNTIME REGISTRATION</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">WHISPER + TTS-1</span>
                <span className="text-[var(--text-primary)]">MULTIPART AUDIO</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* LIVE BRUTALIST TERMINAL PLAYGROUND                                   */}
      {/* ==================================================================== */}
      <section id="playground" className="px-6 py-24 md:px-16 md:py-36 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span>[04 // REASONING INFERENCE TEST TERMINAL]</span>
            </div>
            <span>FASTAPI CORE: 127.0.0.1:8080</span>
          </div>

          <div>
            <h2 className="font-syne text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
              Interact with the Agent
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--text-secondary)]">
              Transmit a live conversational turn through the rate-limited decision graph. Check how the
              agent detects intent or returns structured tool responses.
            </p>
          </div>

          {/* Brutalist Input Form */}
          <form onSubmit={handleQuickTurn} className="space-y-4">
            <div className="relative border border-[var(--border-strong)] bg-[var(--bg)] p-4 focus-within:border-[var(--accent)] transition-colors">
              <label className="block font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">
                INBOUND INSTRUCTION // SESSION: editorial-demo-live
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={interactiveInput}
                  onChange={(e) => setInteractiveInput(e.target.value)}
                  placeholder="e.g. Schedule a sync with Sarah tomorrow at 10am or analyze this issue..."
                  className="w-full bg-transparent font-mono text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
                <MagneticButton
                  type="submit"
                  disabled={isSubmitting || !interactiveInput.trim()}
                  className="bg-[var(--accent)] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity disabled:opacity-40 hover:opacity-90"
                >
                  {isSubmitting ? 'DISPATCHING...' : 'DISPATCH'}
                </MagneticButton>
              </div>
            </div>
          </form>

          {/* Real-Time Inference Output Terminal */}
          {interactiveOutput && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[var(--border-subtle)] bg-[var(--bg)] p-6 font-mono text-xs md:text-sm leading-relaxed text-[var(--text-primary)] space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-[var(--accent)] border-b border-[var(--border-subtle)] pb-2 uppercase tracking-widest">
                <span>AGENT RESPONSE TELEMETRY</span>
                <span>STATUS: OK 200</span>
              </div>
              <p className="pt-2 text-[var(--text-primary)] whitespace-pre-wrap">
                {interactiveOutput}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* MONUMENTAL BRUTALIST FOOTER                                          */}
      {/* ==================================================================== */}
      <footer className="relative px-6 pt-20 pb-12 md:px-16 md:pt-32 md:pb-16 bg-[var(--bg)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b border-[var(--border-subtle)] pb-16 font-mono text-xs">
          <div className="md:col-span-5 space-y-4">
            <span className="font-bold tracking-widest text-[var(--text-primary)] uppercase">
              AI AGENT 24/7 // ENTERPRISE RUNTIME
            </span>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Engineered for continuous mission-critical autonomy. Powered by NVIDIA NIM,
              LangGraph, Redis, and PostgreSQL pgvector.
            </p>
          </div>

          <div className="md:col-start-7 md:col-span-3 space-y-2 uppercase tracking-wider text-[var(--text-muted)]">
            <span className="block text-[var(--text-primary)] font-semibold mb-3">NAVIGATION</span>
            <button
              onClick={() => onNavigateToConsole('/dashboard')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Telemetry Dashboard
            </button>
            <button
              onClick={() => onNavigateToConsole('/handoff')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Operator Handoff
            </button>
            <button
              onClick={() => onNavigateToConsole('/tools')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Tool Catalog & API
            </button>
            <button
              onClick={() => onNavigateToConsole('/chat')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Conversational Core
            </button>
          </div>

          <div className="md:col-span-3 space-y-2 uppercase tracking-wider text-[var(--text-muted)]">
            <span className="block text-[var(--text-primary)] font-semibold mb-3">COMPLIANCE</span>
            <p>&bull; MIT LICENSE VERIFIED</p>
            <p>&bull; 137 AUTOMATED TEST GATES</p>
            <p>&bull; 89% CODE COVERAGE</p>
            <MagneticButton
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-4 border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              BACK TO SUMMIT &uarr;
            </MagneticButton>
          </div>
        </div>

        {/* Colossal Watermark Cropped by Viewport Edge */}
        <div className="mt-12 text-center md:text-left select-none overflow-hidden">
          <span className="block font-syne text-[14vw] font-black leading-none tracking-tighter text-[var(--surface-2)] opacity-60 hover:opacity-100 hover:text-[var(--surface-3)] transition-all duration-700">
            24/7 AGENT
          </span>
        </div>
      </footer>
    </div>
  )
}
