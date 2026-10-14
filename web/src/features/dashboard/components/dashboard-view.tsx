import { ExternalLink, RefreshCw, HelpCircle, Activity, ShieldCheck, Zap } from 'lucide-react'
import { Button, ErrorState, Skeleton } from '@/shared/ui'
import { useDashboardMetrics } from '../api/use-dashboard-metrics'
import { KpiGrid } from './kpi-grid'
import { MetricsSnapshot } from './metrics-snapshot'

export function DashboardView() {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useDashboardMetrics()

  if (isError) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <ErrorState
          title="FALHA NA CONEXÃO COM O SERVIDOR"
          message={error instanceof Error ? error.message : 'Não foi possível buscar as métricas do servidor.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10 lg:p-16 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#2B2B2B] pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#818181] mb-2">
            <span>[01 // TELEMETRIA]</span>
            <span>PAINEL DE CONTROLE EM TEMPO REAL</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#EDEDED] leading-none">
            Visão Geral do Robô
          </h1>
          <p className="mt-3 font-sans text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
            Acompanhe quantas pessoas o seu agente atendeu, se há clientes aguardando um atendente humano e quais ferramentas estão funcionando.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-cursor
            data-cursor-label="atualizar"
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            <span>ATUALIZAR DADOS</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="métricas"
            className="gap-2"
          >
            <a href="/metrics" target="_blank" rel="noreferrer">
              DADOS TÉCNICOS /METRICS <ExternalLink className="h-3 w-3" />
            </a>
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            data-cursor
            data-cursor-label="grafana"
            className="gap-2"
          >
            <a href="http://localhost:3000" target="_blank" rel="noreferrer">
              PAINEL GRAFANA <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Guia Didático para Usuário Leigo */}
      <div className="border border-[#2B2B2B] bg-[#0D0D0D] p-6 text-sm text-[#A0A0A0] leading-relaxed relative">
        <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-[#C6F432] font-bold mb-3">
          <HelpCircle className="h-4 w-4" />
          <span>GUIA RÁPIDO: O QUE SIGNIFICA CADA INFORMAÇÃO NESTA TELA?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
          <div className="border-l border-[#2B2B2B] pl-4">
            <div className="flex items-center gap-1.5 text-[#EDEDED] font-semibold mb-1">
              <Activity className="h-3.5 w-3.5 text-[#C6F432]" />
              <span>1. Atendimentos & Respostas</span>
            </div>
            <p>Mostra o total de mensagens que o robô já trocou com os clientes. Quanto mais esse número sobe, mais trabalho o robô poupou da sua equipe.</p>
          </div>
          <div className="border-l border-[#2B2B2B] pl-4">
            <div className="flex items-center gap-1.5 text-[#EDEDED] font-semibold mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>2. Chamados com Humanos</span>
            </div>
            <p>Se o cliente pediu para cancelar ou solicitou um atendente, o robô cria um chamado na aba <strong>&quot;Atendimento Humano&quot;</strong> para você responder.</p>
          </div>
          <div className="border-l border-[#2B2B2B] pl-4">
            <div className="flex items-center gap-1.5 text-[#EDEDED] font-semibold mb-1">
              <Zap className="h-3.5 w-3.5 text-[#C6F432]" />
              <span>3. Habilidades do Robô</span>
            </div>
            <p>Indica as ferramentas extras que o robô tem permissão para acionar (como buscar no Google, ver banco de dados ou verificar a previsão do tempo).</p>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[#818181]">
            // INDICADORES PRINCIPAIS DE DESEMPENHO
          </span>
          <span className="font-mono text-[10px] text-[#C6F432]">
            [● SERVIDOR ATIVO E MONITORANDO]
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
            ))}
          </div>
        ) : (
          <KpiGrid stats={stats} />
        )}
      </div>

      {/* Metrics Snapshot */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[#818181]">
            // REGISTRO TÉCNICO BRUTO DO SERVIDOR (PROMETHEUS)
          </span>
          <span className="font-mono text-[10px] text-[#818181]">
            FORMATO: TEXTO PURO (PARA DESENVOLVEDORES)
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
        ) : (
          <MetricsSnapshot
            rawText={stats?.rawMetricsText}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />
        )}
      </div>
    </div>
  )
}
