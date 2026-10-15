import { Compass, Home, LayoutDashboard } from 'lucide-react'
import { Button } from '@/shared/ui'

export interface NotFoundViewProps {
  onNavigate: (path: string) => void
  requestedPath: string
}

export function NotFoundView({ onNavigate, requestedPath }: NotFoundViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6 text-center font-sans">
      <div className="relative w-full max-w-lg border border-[#2B2B2B] bg-[#0D0D0D] p-8 sm:p-12 text-[#EDEDED] shadow-2xl">
        <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
        <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

        <div className="w-14 h-14 mx-auto mb-6 rounded-none border border-[#2B2B2B] bg-[#000000] flex items-center justify-center text-[#C6F432]">
          <Compass className="h-7 w-7" />
        </div>

        <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-[#818181] mb-2">
          <span>[ERRO 404 // COORDENADA INEXISTENTE]</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[#EDEDED] leading-none mb-4">
          Página Não Encontrada
        </h1>

        <p className="font-sans text-xs text-[#A0A0A0] leading-relaxed mb-6 max-w-md mx-auto">
          O caminho <code className="font-mono text-[#C6F432] bg-[#000000] px-1.5 py-0.5 border border-[#2B2B2B]">{requestedPath}</code> não foi localizado no roteador da aplicação. Verifique se o endereço foi digitado corretamente.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[#2B2B2B]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/')}
            data-cursor
            data-cursor-label="início"
            className="gap-2 font-mono text-xs"
          >
            <Home className="h-3.5 w-3.5" />
            <span>PÁGINA INICIAL</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onNavigate('/dashboard')}
            data-cursor
            data-cursor-label="painel"
            className="gap-2 font-mono text-xs"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>IR PARA O PAINEL</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
