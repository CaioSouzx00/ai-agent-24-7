import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, send to centralized telemetry if needed
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (e: unknown, extra: unknown) => void } }).Sentry.captureException(error, { extra: errorInfo })
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] text-[#EDEDED] flex items-center justify-center p-6 font-sans">
          <div className="relative w-full max-w-lg border border-red-900/60 bg-[#0D0D0D] p-8 text-[#EDEDED] shadow-2xl">
            <span className="absolute top-0 right-0 text-[10px] font-mono text-red-500/40 p-2 leading-none">+</span>
            <span className="absolute bottom-0 left-0 text-[10px] font-mono text-red-500/40 p-2 leading-none">+</span>

            <div className="flex items-center gap-3 border-b border-red-900/40 pb-4 mb-4">
              <div className="p-2 bg-red-950/40 border border-red-800/60 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-red-400 tracking-widest">[FALHA DE RENDERIZAÇÃO]</span>
                <h2 className="font-syne text-xl font-bold uppercase tracking-tight text-[#EDEDED]">
                  Ocorreu um erro inesperado
                </h2>
              </div>
            </div>

            <p className="font-sans text-xs text-[#A0A0A0] leading-relaxed mb-4">
              A interface encontrou uma anomalia inesperada. Seus dados e configurações permanecem salvos em segurança no seu navegador.
            </p>

            {this.state.error && (
              <div className="mb-6 border border-[#2B2B2B] bg-[#000000] p-3 font-mono text-[11px] text-red-300 overflow-x-auto max-h-32">
                {this.state.error.message || 'Erro desconhecido de execução'}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#2B2B2B]">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2 font-mono text-xs"
              >
                <Home className="h-3.5 w-3.5" />
                <span>IR PARA O INÍCIO</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReload}
                className="gap-2 font-mono text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>RECARREGAR PÁGINA</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
