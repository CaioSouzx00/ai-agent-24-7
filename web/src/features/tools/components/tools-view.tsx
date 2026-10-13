import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Trash2, Wrench, Globe, ExternalLink, Cpu } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Input, Skeleton } from '@/shared/ui'
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
      <div className="p-8">
        <ErrorState
          title="Failed to load tool catalogue"
          message={error instanceof Error ? error.message : 'Could not fetch tools from the agent registry.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Tool Catalogue
            </h1>
            <Badge variant="info" className="gap-1 text-xs">
              <Cpu className="h-3 w-3" /> Tool Calling
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Core capabilities and dynamic runtime tools accessible by the LLM reasoning loop.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-indigo-500/20">
          <Plus className="h-4 w-4" /> Create Dynamic Tool
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex gap-1.5 text-xs">
          {(['all', 'core', 'dynamic'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all capitalize ${
                filterType === type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tools found"
          description={
            search ? `No tools match "${search}".` : 'No registered tools in this category.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tool) => (
            <Card key={tool.name} className="flex flex-col justify-between p-5 hover:border-indigo-500/30">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {tool.name}
                    </span>
                    <Badge variant={tool.isDynamic ? 'info' : 'purple'} className="text-[10px] py-0">
                      {tool.isDynamic ? 'Dynamic' : 'Core'}
                    </Badge>
                  </div>

                  {tool.isDynamic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTool.mutate(tool.name)}
                      disabled={deleteTool.isPending}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {tool.url && (
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono text-slate-400 truncate max-w-[280px]">
                    <Globe className="h-3 w-3 shrink-0 text-indigo-400" /> {tool.url}
                  </span>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-1"
                  >
                    Test endpoint <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal / Dialog for creating dynamic tool */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="glass-panel w-full max-w-lg rounded-xl p-6 shadow-2xl border border-border/80">
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" />
                <h3 className="font-display text-lg font-bold">Register Dynamic Tool</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Tool Name (identifier)</label>
                <Input
                  {...register('name')}
                  placeholder="e.g. weather_api, currency_converter"
                  className="mt-1"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Description (provided to LLM)</label>
                <Input
                  {...register('description')}
                  placeholder="e.g. Fetches current weather given a city name"
                  className="mt-1"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Target URL</label>
                <Input
                  {...register('url')}
                  placeholder="https://api.example.com/v1/data"
                  className="mt-1"
                />
                {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTool.isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {createTool.isPending ? 'Registering...' : 'Register Tool'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
