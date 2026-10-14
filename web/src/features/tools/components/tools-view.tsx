import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Trash2, Globe, ExternalLink, Cpu } from 'lucide-react'
import { Button, Input, Skeleton } from '@/shared/ui'
import { useTools, useToolMutations } from '../api/use-tools'
import { CreateDynamicToolSchema, type CreateDynamicToolInput } from '../schemas/tools-schemas'

export function ToolsView() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'core' | 'dynamic'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  if (isError) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-mono text-xs text-red-400">
        // FAILED TO QUERY TOOL CATALOGUE: {error instanceof Error ? error.message : 'Registry unreachable'}
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 block">
          RETRY QUERY
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
            <span>[04 // TOOL MATRIX]</span>
            <span>LLM REASONING CAPABILITY CATALOGUE</span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-normal tracking-tight text-[#EDEDED] leading-none">
            Tool Matrix
          </h1>
          <p className="mt-3 font-sans text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
            Deterministic functions and dynamically synthesized HTTP webhooks registered into the agent’s schema context.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="default"
          size="sm"
          data-cursor
          data-cursor-label="create"
          className="gap-2 font-mono text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>REGISTER DYNAMIC TOOL</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#818181]" />
          <Input
            placeholder="Search capabilities by name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-[#0D0D0D]"
          />
        </div>

        <div className="flex gap-1 text-xs">
          {(['all', 'core', 'dynamic'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              data-cursor
              data-cursor-label="filter"
              className={`px-3 py-1 font-mono text-[11px] uppercase transition-colors ${
                filterType === type
                  ? 'bg-[#EDEDED] text-black font-bold'
                  : 'bg-[#0D0D0D] border border-[#2B2B2B] text-[#818181] hover:text-[#EDEDED]'
              }`}
            >
              [{type}]
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
          // NO TOOLS MATCHING QUERY &quot;{search}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((tool) => (
            <div
              key={tool.name}
              data-cursor
              data-cursor-label="inspect"
              className="relative border border-[#2B2B2B] bg-[#0D0D0D] p-6 flex flex-col justify-between hover:border-[#595959] transition-colors group"
            >
              <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>
              <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#EDEDED] group-hover:text-[#C6F432] transition-colors">
                      {tool.name}()
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase px-1.5 py-0.2 border ${
                        tool.isDynamic
                          ? 'border-[#C6F432]/50 text-[#C6F432] bg-[#C6F432]/10'
                          : 'border-[#595959] text-[#818181]'
                      }`}
                    >
                      {tool.isDynamic ? 'DYNAMIC' : 'CORE'}
                    </span>
                  </div>

                  {tool.isDynamic && (
                    <button
                      onClick={() => deleteTool.mutate(tool.name)}
                      disabled={deleteTool.isPending}
                      data-cursor
                      data-cursor-label="purge"
                      className="font-mono text-[10px] text-red-400 hover:text-red-300 border border-red-900/40 px-1.5 py-0.5"
                    >
                      [PURGE]
                    </button>
                  )}
                </div>

                <p className="mt-3 font-sans text-xs text-[#A0A0A0] leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {tool.url && (
                <div className="mt-6 pt-3 border-t border-[#1A1A1A] flex items-center justify-between font-mono text-[11px] text-[#818181]">
                  <span className="truncate max-w-[260px] text-[#A0A0A0]">
                    {tool.url}
                  </span>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#C6F432] inline-flex items-center gap-1 transition-colors"
                  >
                    TEST ↗
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
          <div className="relative w-full max-w-lg border border-[#595959] bg-[#0D0D0D] p-6 text-[#EDEDED] shadow-2xl">
            <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
            <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

            <div className="flex items-center justify-between pb-3 border-b border-[#2B2B2B]">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#818181] tracking-widest">[DYNAMIC SYNTHESIS]</span>
                <h3 className="font-syne text-lg font-bold uppercase text-[#EDEDED]">
                  Register Dynamic Tool
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="font-mono text-xs text-[#818181] hover:text-[#EDEDED]"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Tool Identifier (snake_case)
                </label>
                <Input
                  {...register('name')}
                  placeholder="e.g. weather_oracle, exchange_rate"
                  className="w-full bg-[#000000]"
                />
                {errors.name && <p className="mt-1 font-mono text-xs text-red-400">{errors.name.message}</p>}
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Prompt Description (context for LLM)
                </label>
                <Input
                  {...register('description')}
                  placeholder="e.g. Fetches realtime weather data given latitude and longitude coordinates"
                  className="w-full bg-[#000000]"
                />
                {errors.description && (
                  <p className="mt-1 font-mono text-xs text-red-400">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Target Webhook URL
                </label>
                <Input
                  {...register('url')}
                  placeholder="https://api.domain.com/v1/endpoint"
                  className="w-full bg-[#000000]"
                />
                {errors.url && <p className="mt-1 font-mono text-xs text-red-400">{errors.url.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2B2B2B]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTool.isPending}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{createTool.isPending ? 'REGISTERING...' : 'REGISTER TOOL'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
