import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, HelpCircle, Globe, ExternalLink, Zap } from 'lucide-react'
import { Button, Input, Skeleton } from '@/shared/ui'
import { useTools, useToolMutations } from '../api/use-tools'
import { CreateDynamicToolSchema, type CreateDynamicToolInput } from '../schemas/tools-schemas'

export function ToolsView() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'core' | 'dynamic'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<string | null>(null)

  const { data: tools = [], isLoading, isError, error, refetch } = useTools()
  const { createTool, deleteTool } = useToolMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDynamicToolInput>({
    resolver: zodResolver(CreateDynamicToolSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      method: 'POST',
    },
  })

  const onSubmit = (data: CreateDynamicToolInput) => {
    createTool.mutate(data, {
      onSuccess: () => {
        reset()
        setIsModalOpen(false)
      },
    })
  }

  const filtered = tools.filter((t) => {
    if (filterType === 'core' && t.isDynamic) return false
    if (filterType === 'dynamic' && !t.isDynamic) return false
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  })

  const filterLabels: Record<string, string> = {
    all: 'TODAS',
    core: 'NATIVAS DO SISTEMA',
    dynamic: 'PERSONALIZADAS (DINÂMICAS)',
  }

  if (isError) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-mono text-xs text-red-400">
        // FALHA AO CONSULTAR CATÁLOGO DE FERRAMENTAS: {error instanceof Error ? error.message : 'Servidor indisponível'}
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 block">
          TENTAR NOVAMENTE
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10 lg:p-16 max-w-7xl mx-auto font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#2B2B2B] pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#818181] mb-2">
            <span>[04 // FERRAMENTAS]</span>
            <span>SUPERPODERES E AÇÕES QUE O ROBÔ EXECUTA</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#EDEDED] leading-none">
            Habilidades do Robô
          </h1>
          <p className="mt-3 font-sans text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
            Aqui estão as funções que o robô pode chamar sozinho durante uma conversa para buscar dados, pesquisar na internet ou conectar aos seus sistemas.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="default"
          size="sm"
          data-cursor
          data-cursor-label="criar"
          className="gap-2 font-mono text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>+ CADASTRAR NOVA HABILIDADE</span>
        </Button>
      </div>

      {/* Caixa Explicativa para Usuário Leigo */}
      <div className="border border-[#2B2B2B] bg-[#0D0D0D] p-6 text-sm text-[#A0A0A0] leading-relaxed relative">
        <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
        <div className="flex items-center gap-2 font-mono text-xs uppercase text-[#C6F432] font-bold mb-3">
          <HelpCircle className="h-4 w-4" />
          <span>O QUE É UMA FERRAMENTA (TOOL) E COMO ELA FUNCIONA?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
          <div className="border-l border-[#2B2B2B] pl-4">
            <strong className="text-[#EDEDED] block mb-1">1. Além de conversar</strong>
            <p>Modelos de inteligência comuns só sabem falar. Com ferramentas, o robô consegue tomar ações de verdade, como checar banco de dados ou fazer contas complexas.</p>
          </div>
          <div className="border-l border-[#2B2B2B] pl-4">
            <strong className="text-[#EDEDED] block mb-1">2. Decisão Inteligente</strong>
            <p>Você não precisa dizer qual ferramenta usar. O robô lê o pedido do cliente e decide autonomamente qual é a ferramenta correta para aquele momento.</p>
          </div>
          <div className="border-l border-[#2B2B2B] pl-4">
            <strong className="text-[#EDEDED] block mb-1">3. Conecte ao seu Sistema</strong>
            <p>Se você tem um sistema próprio (estoque, pedidos, etc.), basta cadastrar o link da API pelo botão acima para que o robô possa consultá-lo.</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#818181]" />
          <Input
            placeholder="Buscar por nome ou descrição da ferramenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-[#0D0D0D]"
          />
        </div>

        <div className="flex gap-1 text-xs overflow-x-auto">
          {(['all', 'core', 'dynamic'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              data-cursor
              data-cursor-label="filtro"
              className={`px-3 py-1 font-mono text-[10px] uppercase transition-colors shrink-0 ${
                filterType === type
                  ? 'bg-[#EDEDED] text-black font-bold'
                  : 'bg-[#0D0D0D] border border-[#2B2B2B] text-[#818181] hover:text-[#EDEDED]'
              }`}
            >
              [{filterLabels[type]}]
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-none bg-[#0D0D0D] border border-[#2B2B2B]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-[#2B2B2B] bg-[#0D0D0D] p-12 text-center font-mono text-xs text-[#818181]">
          // NENHUMA HABILIDADE ENCONTRADA COM A BUSCA &quot;{search}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((tool) => (
            <div
              key={tool.name}
              data-cursor
              data-cursor-label="detalhes"
              className="relative border border-[#2B2B2B] bg-[#0D0D0D] p-6 flex flex-col justify-between hover:border-[#595959] transition-colors group"
            >
              <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>
              <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#C6F432]" />
                    <span className="font-mono text-sm font-bold text-[#EDEDED] group-hover:text-[#C6F432] transition-colors">
                      {tool.name}()
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${
                        tool.isDynamic
                          ? 'border-[#C6F432]/50 text-[#C6F432] bg-[#C6F432]/10'
                          : 'border-[#595959] text-[#818181]'
                      }`}
                    >
                      {tool.isDynamic ? 'PERSONALIZADA' : 'NATIVA'}
                    </span>
                  </div>

                  {tool.isDynamic && (
                    <button
                      onClick={() => setToolToDelete(tool.name)}
                      disabled={deleteTool.isPending}
                      data-cursor
                      data-cursor-label="remover"
                      className="font-mono text-[10px] text-red-400 hover:text-red-300 border border-red-900/40 px-1.5 py-0.5"
                    >
                      [REMOVER]
                    </button>
                  )}
                </div>

                <p className="mt-3 font-sans text-xs text-[#A0A0A0] leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {tool.url && (
                <div className="mt-6 pt-3 border-t border-[#1A1A1A] flex items-center justify-between font-mono text-[11px] text-[#818181]">
                  <span className="truncate max-w-[260px] text-[#A0A0A0] flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#C6F432]" />
                    {tool.url}
                  </span>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#C6F432] inline-flex items-center gap-1 transition-colors"
                  >
                    TESTAR ENDPOINT ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal / Dialog for creating dynamic tool */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg border border-[#595959] bg-[#0D0D0D] p-6 sm:p-8 text-[#EDEDED] shadow-2xl">
            <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
            <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

            <div className="flex items-center justify-between pb-3 border-b border-[#2B2B2B]">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#818181] tracking-widest">[NOVA HABILIDADE]</span>
                <h3 className="font-syne text-lg font-bold uppercase text-[#EDEDED]">
                  Cadastrar Ferramenta para o Robô
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="font-mono text-xs text-[#818181] hover:text-[#EDEDED]"
              >
                [FECHAR ESC]
              </button>
            </div>

            <p className="mt-2 text-xs text-[#A0A0A0] leading-relaxed">
              Adicione um link de API externa para que o robô possa consultar dados em tempo real.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  1. Nome da Ferramenta (identificador sem espaços)
                </label>
                <Input
                  {...register('name')}
                  maxLength={64}
                  placeholder="Ex: consulta_clima, rastrear_pedido, preco_dolar"
                  className="w-full bg-[#000000]"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Use letras minúsculas e sublinhado (snake_case, máx. 64 caracteres).
                </p>
                {errors.name && <p className="mt-1 font-mono text-xs text-red-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  2. O que esta ferramenta faz? (Instrução para a IA)
                </label>
                <Input
                  {...register('description')}
                  maxLength={500}
                  placeholder="Ex: Busca a previsão do tempo para a cidade informada pelo cliente"
                  className="w-full bg-[#000000]"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Escreva com clareza. O robô lê essa frase para saber exatamente quando deve usá-la (máx. 500 caracteres)!
                </p>
                {errors.description && (
                  <p className="mt-1 font-mono text-xs text-red-400">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  3. Link da API (URL de Destino)
                </label>
                <Input
                  {...register('url')}
                  maxLength={2048}
                  placeholder="https://api.seuservidor.com/v1/consulta"
                  className="w-full bg-[#000000]"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  O endereço web onde o robô enviará a requisição HTTP.
                </p>
                {errors.url && <p className="mt-1 font-mono text-xs text-red-400">{errors.url.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2B2B2B]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTool.isPending}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{createTool.isPending ? 'CADASTRANDO...' : 'CADASTRAR HABILIDADE'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Destructive Delete */}
      {toolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-red-900/60 bg-[#0D0D0D] p-6 text-[#EDEDED] shadow-2xl">
            <h3 className="font-syne text-lg font-bold uppercase text-red-400 mb-2">
              Confirmar Exclusão de Ferramenta
            </h3>
            <p className="font-sans text-xs text-[#A0A0A0] leading-relaxed mb-6">
              Tem certeza de que deseja remover a habilidade <strong className="text-[#EDEDED] font-mono">&quot;{toolToDelete}&quot;</strong>? O robô não poderá mais chamá-la durante as conversas com os clientes.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-[#2B2B2B]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setToolToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleteTool.isPending}
                onClick={() => {
                  deleteTool.mutate(toolToDelete, {
                    onSettled: () => setToolToDelete(null),
                  })
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs"
              >
                {deleteTool.isPending ? 'REMOVENDO...' : 'SIM, REMOVER FERRAMENTA'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
