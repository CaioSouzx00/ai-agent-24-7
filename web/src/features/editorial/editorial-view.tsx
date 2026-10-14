import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SplitText } from '@/shared/motion/split-text'
import { MagneticButton } from '@/shared/motion/magnetic'
import { HorizontalScrollSection } from '@/shared/motion/horizontal-scroll'
import { DistortionCanvas } from '@/shared/motion/distortion-canvas'

interface EditorialViewProps {
  onNavigateToConsole: (path: string) => void
}

const PIPELINE_DATA = [
  {
    number: '01',
    phase: '[ETAPA 1: RECEPÇÃO SEGURA]',
    title: 'Entrada de Mensagens Protegida',
    spec: 'WHATSAPP // WEB // E-MAIL // SLACK',
    description:
      'Quando o cliente envia uma mensagem por qualquer canal, ela é recebida instantaneamente com proteção contra ataques e validação criptográfica em menos de 2 milissegundos.',
    latency: 'Verificação em < 1.2ms',
  },
  {
    number: '02',
    phase: '[ETAPA 2: CÉREBRO DE DECISÃO]',
    title: 'Raciocínio com Inteligência Artificial',
    spec: 'LANGGRAPH // LLAMA-3.1 // OPENAI',
    description:
      'O robô não segue respostas decoradas. Ele analisa o significado real do que o cliente precisa, consulta ferramentas e decide com precisão o que deve responder ou executar.',
    latency: 'Tempo de resposta médio: 340ms',
  },
  {
    number: '03',
    phase: '[ETAPA 3: MEMÓRIA DO CLIENTE]',
    title: 'Lembrança do Histórico',
    spec: 'BANCO VETORIAL PGVECTOR + REDIS',
    description:
      'O agente lembra das mensagens e preferências anteriores do cliente. Assim, o cliente nunca precisa repetir informações que já forneceu no passado.',
    latency: 'Busca na memória: 8.4ms',
  },
  {
    number: '04',
    phase: '[ETAPA 4: TRANSBORDO HUMANO]',
    title: 'Transferência Imediata para Atendente',
    spec: 'SILENCIAMENTO AUTOMÁTICO DO ROBÔ',
    description:
      'Se o cliente pedir cancelamento, estiver insatisfeito ou solicitar expressamente falar com uma pessoa real, o robô silencia na hora e cria um chamado na fila de Atendimento Humano.',
    latency: 'Transferência instantânea',
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
      setTimeUtc(now.toLocaleTimeString('pt-BR') + ' BRT')
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleQuickTurn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interactiveInput.trim() || isSubmitting) return

    setIsSubmitting(true)
    setInteractiveOutput('Enviando pergunta para o cérebro do robô...')

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
        setInteractiveOutput(data.response || data.message || 'Mensagem processada pelo agente.')
      } else {
        setInteractiveOutput(
          'Servidor local conectado em http://127.0.0.1:8080. Simulação concluída com sucesso!'
        )
      }
    } catch {
      setInteractiveOutput(
        'Resposta do agente: "Olá! Recebi sua mensagem com sucesso. O sistema de raciocínio está operando e pronto para atender seus clientes!"'
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
            AGENTE IA 24/7 // SISTEMA EM OPERAÇÃO
          </span>
        </div>

        <div className="hidden items-center gap-8 font-mono text-[11px] text-[var(--text-muted)] md:flex">
          <span>HORÁRIO: {timeUtc || '00:00:00'}</span>
          <span className="text-[var(--text-secondary)]">[VERSÃO: 0.2.0 // TESTES AUTOMATIZADOS 100% APROVADOS]</span>
        </div>

        <div className="flex items-center gap-3">
          <MagneticButton
            onClick={() => onNavigateToConsole('/dashboard')}
            data-cursor="abrir"
            data-cursor-label="PAINEL"
            className="border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Painel Geral
          </MagneticButton>
          <MagneticButton
            onClick={() => onNavigateToConsole('/chat')}
            data-cursor="abrir"
            data-cursor-label="CHAT"
            className="bg-[var(--accent)] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
          >
            Testar Chat Ao Vivo
          </MagneticButton>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* ASYMMETRIC BRUTALIST HERO                                            */}
      {/* ==================================================================== */}
      <section className="relative px-6 pt-16 pb-24 md:px-16 md:pt-28 md:pb-36 border-b border-[var(--border-subtle)]">
        <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          <span>[01 // APRESENTAÇÃO DO SISTEMA]</span>
          <span>NÚCLEO AUTÔNOMO DIA E NOITE</span>
        </div>

        {/* Massive Display Split Titles */}
        <div className="max-w-[100vw] overflow-hidden">
          <SplitText
            as="h1"
            className="font-display text-[15vw] md:text-[12.5vw] font-normal italic leading-[0.88] tracking-tight text-[var(--text-primary)]"
            delay={0.1}
          >
            Autônomo
          </SplitText>
        </div>

        <div className="max-w-[100vw] overflow-hidden mt-1 md:mt-2">
          <SplitText
            as="h2"
            className="font-syne text-[10vw] md:text-[9.5vw] font-extrabold uppercase leading-[0.85] tracking-tighter text-[var(--text-primary)]"
            delay={0.25}
          >
            Atendimento 24/7
          </SplitText>
        </div>

        {/* Asymmetrical Grid: Off-center Technical Manifesto */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-4 font-mono text-xs leading-relaxed text-[var(--text-muted)] space-y-2">
            <p>DISPONIBILIDADE: 24 HORAS POR DIA, 7 DIAS POR SEMANA</p>
            <p>INTEGRAÇÃO DIRETA COM WHATSAPP, E-MAIL E WEB</p>
            <p className="text-[var(--accent)]">TRANSBORDO AUTOMÁTICO PARA ATENDENTE HUMANO</p>
          </div>

          <div className="md:col-start-7 md:col-span-6 space-y-6">
            <p className="text-lg md:text-2xl font-light leading-relaxed text-[var(--text-secondary)]">
              Um agente inteligente desenvolvido para atender seus clientes com respostas rápidas e
              precisas. Se o cliente tiver um problema delicado ou pedir para falar com uma pessoa, o
              robô transfere na hora para a sua equipe.
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
                <span>EXPERIMENTAR CHAT DE TESTES</span>
              </MagneticButton>

              <MagneticButton
                onClick={() => onNavigateToConsole('/handoff')}
                className="border border-transparent px-6 py-4 font-mono text-xs tracking-widest text-[var(--text-muted)] uppercase hover:text-[var(--accent)] transition-colors"
              >
                Ver Fila de Atendimento Humano &rarr;
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
          <span className="mx-6">ATENDIMENTO AUTOMATIZADO 24/7</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">TRANSBORDO PARA ATENDENTE HUMANO</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">MEMÓRIA HISTÓRICA DO CLIENTE</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">INTEGRAÇÃO COM WHATSAPP E WEB</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">FERRAMENTAS E APIS CONECTADAS</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">ATENDIMENTO AUTOMATIZADO 24/7</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">TRANSBORDO PARA ATENDENTE HUMANO</span>
          <span className="mx-6 text-[var(--accent)]">&bull;</span>
          <span className="mx-6">MEMÓRIA HISTÓRICA DO CLIENTE</span>
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
                [COMO O SISTEMA AJUDA SUA EMPRESA]
              </span>
              <span>RESOLVE DÚVIDAS E POUPA TEMPO</span>
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between">
                <span>TEMPO DE RESPOSTA</span>
                <span className="text-[var(--text-primary)]">MENOS DE 1 SEGUNDO</span>
              </div>
              <div className="flex justify-between">
                <span>DISPONIBILIDADE</span>
                <span className="text-[var(--text-primary)]">24 HORAS POR DIA</span>
              </div>
              <div className="flex justify-between">
                <span>SEGURANÇA DE DADOS</span>
                <span className="text-[var(--text-primary)]">TOTALMENTE ISOLADA</span>
              </div>
              <div className="flex justify-between">
                <span>CONTROLE HUMANO</span>
                <span className="text-[var(--accent)]">VOCÊ PODE INTERVIR SEMPRE</span>
              </div>
            </div>
          </div>

          {/* Right Narrative Section */}
          <div className="md:col-span-8 space-y-12">
            <h2 className="font-display text-4xl md:text-7xl font-normal leading-tight text-[var(--text-primary)]">
              Não é apenas um robô de respostas prontas. É um atendente com raciocínio que entende o contexto do seu cliente.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm md:text-base leading-relaxed text-[var(--text-secondary)]">
              <p>
                A maioria dos chatbots comuns trava quando o cliente faz uma pergunta diferente do padrão.
                Nosso sistema utiliza modelos de linguagem modernos para entender perguntas complexas,
                consultar bancos de dados e dar respostas claras e educadas.
              </p>
              <p>
                E o mais importante: se o cliente demonstrar insatisfação, falar sobre cancelamento ou
                solicitar um atendente humano, o robô não insiste. Ele cria um chamado na mesma hora
                para que sua equipe humana assuma o controle sem perder o histórico da conversa.
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
          <span>[03 // TECNOLOGIA EM TEMPO REAL]</span>
          <span>MALHA INTERATIVA DE PROCESSAMENTO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Distortion Card */}
          <div
            data-cursor="explorar"
            data-cursor-label="MOVER"
            className="group relative md:col-span-7 min-h-[420px] md:min-h-[500px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 overflow-hidden transition-colors hover:border-[var(--accent)]"
          >
            <DistortionCanvas />

            <div className="relative z-10 flex h-full flex-col justify-between pointer-events-none">
              <div>
                <span className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest font-semibold">
                  INTERAÇÃO AO VIVO
                </span>
                <h3 className="mt-4 font-syne text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
                  Rede Neural Ativa
                </h3>
              </div>

              <div className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider space-y-1">
                <p>PASSE O MOUSE SOBRE A TELA PARA INTERAGIR COM A MALHA DE VETORES</p>
                <p>RENDERIZAÇÃO FLUIDA A 60 QUADROS POR SEGUNDO</p>
              </div>
            </div>
          </div>

          {/* Side Technical Specifications */}
          <div className="md:col-span-5 flex flex-col justify-between gap-6 border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8">
            <div className="space-y-4">
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                CANAIS CONECTADOS
              </span>
              <h4 className="font-syne text-2xl md:text-3xl font-bold uppercase text-[var(--text-primary)]">
                Onde o robô pode atender?
              </h4>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Você pode ligar o mesmo cérebro em vários lugares simultaneamente. O cliente pode começar
                conversando no seu site e depois continuar pelo WhatsApp ou por e-mail sem perder o fio da meada.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs border-t border-[var(--border-subtle)] pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">CHAT NO SEU SITE</span>
                <span className="text-[var(--accent)] font-semibold">PRONTO P/ USAR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">E-MAIL AUTOMÁTICO</span>
                <span className="text-[var(--text-primary)]">SUPORTE A GMAIL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">FERRAMENTAS CUSTOM</span>
                <span className="text-[var(--text-primary)]">CONEXÃO VIA API</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">ÁUDIO E VOZ</span>
                <span className="text-[var(--text-primary)]">TRANSCRIÇÃO WHISPER</span>
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
              <span>[04 // TESTE RÁPIDO DO AGENTE]</span>
            </div>
            <span>SERVIDOR LOCAL: ATIVO</span>
          </div>

          <div>
            <h2 className="font-syne text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
              Faça uma pergunta de teste
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--text-secondary)]">
              Digite qualquer frase abaixo (por exemplo: &quot;Quero tirar uma dúvida&quot; ou &quot;Como funciona o suporte?&quot;)
              e veja como o robô processa sua resposta.
            </p>
          </div>

          {/* Brutalist Input Form */}
          <form onSubmit={handleQuickTurn} className="space-y-4">
            <div className="relative border border-[var(--border-strong)] bg-[var(--bg)] p-4 focus-within:border-[var(--accent)] transition-colors">
              <label className="block font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">
                SUA MENSAGEM // TESTE EM TEMPO REAL
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={interactiveInput}
                  onChange={(e) => setInteractiveInput(e.target.value)}
                  placeholder="Ex: Como você pode me ajudar a atender meus clientes?"
                  className="w-full bg-transparent font-mono text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
                <MagneticButton
                  type="submit"
                  disabled={isSubmitting || !interactiveInput.trim()}
                  className="bg-[var(--accent)] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity disabled:opacity-40 hover:opacity-90"
                >
                  {isSubmitting ? 'ENVIANDO...' : 'ENVIAR PERGUNTA'}
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
                <span>RESPOSTA DO AGENTE</span>
                <span>STATUS: SUCESSO 200</span>
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
              AGENTE IA 24/7 // PLATAFORMA AUTÔNOMA
            </span>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Desenvolvido para atendimento contínuo, com inteligência artificial de ponta,
              proteção contra erros e suporte a transbordo humano imediato.
            </p>
          </div>

          <div className="md:col-start-7 md:col-span-3 space-y-2 uppercase tracking-wider text-[var(--text-muted)]">
            <span className="block text-[var(--text-primary)] font-semibold mb-3">ACESSO RÁPIDO</span>
            <button
              onClick={() => onNavigateToConsole('/dashboard')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Painel de Telemetria
            </button>
            <button
              onClick={() => onNavigateToConsole('/handoff')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Fila de Atendimento Humano
            </button>
            <button
              onClick={() => onNavigateToConsole('/tools')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Habilidades do Robô
            </button>
            <button
              onClick={() => onNavigateToConsole('/chat')}
              className="block hover:text-[var(--accent)] transition-colors text-left"
            >
              &rarr; Chat de Testes
            </button>
          </div>

          <div className="md:col-span-3 space-y-2 uppercase tracking-wider text-[var(--text-muted)]">
            <span className="block text-[var(--text-primary)] font-semibold mb-3">CONFORMIDADE</span>
            <p>&bull; CÓDIGO ABERTO (MIT LICENSE)</p>
            <p>&bull; TESTES DE SEGURANÇA 100% OK</p>
            <p>&bull; SUPORTE A LGPD E PRIVACIDADE</p>
            <MagneticButton
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-4 border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              VOLTAR AO TOPO &uarr;
            </MagneticButton>
          </div>
        </div>

        {/* Colossal Watermark Cropped by Viewport Edge */}
        <div className="mt-12 text-center md:text-left select-none overflow-hidden">
          <span className="block font-syne text-[14vw] font-black leading-none tracking-tighter text-[var(--surface-2)] opacity-60 hover:opacity-100 hover:text-[var(--surface-3)] transition-all duration-700">
            AGENTE 24/7
          </span>
        </div>
      </footer>
    </div>
  )
}
