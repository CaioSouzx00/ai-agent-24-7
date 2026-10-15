import { useState, type ReactNode } from 'react'
import {
  Activity,
  Bot,
  Key,
  Users,
  Wrench,
  Command as CommandIcon,
  Terminal,
  HelpCircle,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, Input, Toaster } from '@/shared/ui'
import { useAuthStore } from '@/shared/lib/auth-store'
import { CommandPalette } from './command-palette'

export interface LayoutProps {
  children: ReactNode
  currentPath: string
  onNavigate: (path: string) => void
}

export function AppLayout({ children, currentPath, onNavigate }: LayoutProps) {
  const { apiKey, setApiKey, operatorName, setOperatorName, isAuthModalOpen, setAuthModalOpen, logout } =
    useAuthStore()
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)
  const [tempOp, setTempOp] = useState(operatorName)

  const navItems = [
    { num: '00', label: 'INÍCIO', path: '/', icon: Terminal },
    { num: '01', label: 'TELEMETRIA', path: '/dashboard', icon: Activity },
    { num: '02', label: 'ATENDIMENTO HUMANO', path: '/handoff', icon: Users },
    { num: '03', label: 'CHAT DO AGENTE', path: '/chat', icon: Bot },
    { num: '04', label: 'FERRAMENTAS', path: '/tools', icon: Wrench },
  ]

  const handleSaveAuth = (e: React.FormEvent) => {
    e.preventDefault()
    setApiKey(tempKey.trim())
    setOperatorName(tempOp.trim() || 'Atendente')
    setIsKeyModalOpen(false)
    setAuthModalOpen(false)
    toast.success('Configurações de autenticação salvas com sucesso!')
  }

  const handleLogout = () => {
    logout()
    setTempKey('')
    toast.info('Sessão encerrada com sucesso.')
  }

  const modalOpen = isKeyModalOpen || isAuthModalOpen

  return (
    <div className="min-h-screen bg-[#000000] text-[#EDEDED] flex flex-col font-sans selection:bg-[#C6F432] selection:text-black">
      {/* Top Hairline Telemetry Bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#2B2B2B] bg-[#000000]/95 px-4 md:px-8 backdrop-blur-md">
        {/* Brand & Kernel Status */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 border border-[#2B2B2B] text-[#EDEDED] hover:border-[#595959]"
            aria-label="Abrir menu de navegação"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div
            onClick={() => onNavigate('/')}
            data-cursor
            data-cursor-label="início"
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#EDEDED] font-bold group-hover:text-[#C6F432] transition-colors">
                AGENTE IA 24/7
              </span>
            </div>
            <span className="hidden sm:inline-block font-mono text-[10px] text-[#818181] border border-[#2B2B2B] px-1.5 py-0.5">
              ONLINE // v0.2.0
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 pl-4 border-l border-[#2B2B2B]">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (currentPath === '/' && item.path === '/') ||
                (currentPath === '/dashboard' && item.path === '/dashboard')
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  data-cursor
                  data-cursor-label="navegar"
                  className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-[#C6F432] border-b border-[#C6F432]'
                      : 'text-[#818181] hover:text-[#EDEDED]'
                  }`}
                >
                  <span className="text-[10px] opacity-60">[{item.num}]</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right Actions & Telemetry State */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
              document.dispatchEvent(event)
            }}
            data-cursor
            data-cursor-label="buscar"
            className="hidden sm:flex items-center gap-2 border border-[#2B2B2B] bg-[#0D0D0D] px-2.5 py-1 font-mono text-xs text-[#818181] hover:border-[#595959] hover:text-[#EDEDED] transition-colors"
          >
            <CommandIcon className="h-3 w-3" />
            <span className="text-[11px]">BUSCAR</span>
            <kbd className="border border-[#2B2B2B] bg-[#1A1A1A] px-1 text-[9px] text-[#EDEDED]">CTRL+K</kbd>
          </button>

          {/* Operator Badge & API Key Trigger */}
          <button
            onClick={() => {
              setTempKey(apiKey)
              setTempOp(operatorName)
              setIsKeyModalOpen(true)
            }}
            data-cursor
            data-cursor-label="perfil"
            className="flex items-center gap-1.5 border border-[#2B2B2B] bg-[#0D0D0D] px-2.5 py-1 font-mono text-xs text-[#EDEDED] hover:border-[#595959] transition-colors"
          >
            <Key className="h-3 w-3 text-[#C6F432]" />
            <span className="hidden sm:inline uppercase text-[11px]">ATENDENTE: {operatorName}</span>
            {apiKey ? (
              <span className="text-[9px] font-mono text-[#C6F432]">[AUTENTICADO]</span>
            ) : (
              <span className="text-[9px] font-mono text-amber-400">[LOCAL]</span>
            )}
          </button>

          {/* Explicit Logout Button if API Key exists */}
          {apiKey && (
            <button
              onClick={handleLogout}
              data-cursor
              data-cursor-label="sair"
              title="Encerrar sessão"
              className="flex items-center gap-1 border border-red-900/40 bg-red-950/20 px-2 py-1 font-mono text-xs text-red-400 hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline text-[10px]">SAIR</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-[#2B2B2B] bg-[#0D0D0D] p-4 flex flex-col gap-2 z-30">
          <div className="font-mono text-[10px] text-[#818181] uppercase tracking-wider mb-1">
            // MENU DE NAVEGAÇÃO
          </div>
          {navItems.map((item) => {
            const isActive = currentPath === item.path
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path)
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center gap-2.5 px-3 py-2 font-mono text-xs uppercase tracking-wider text-left transition-colors border ${
                  isActive
                    ? 'border-[#C6F432] bg-[#C6F432]/10 text-[#C6F432]'
                    : 'border-[#2B2B2B] text-[#A0A0A0] hover:text-[#EDEDED]'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>[{item.num}]</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden bg-[#000000]">{children}</main>

      {/* Command Palette */}
      <CommandPalette onNavigate={onNavigate} />

      {/* API Key & Operator Configuration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg border border-[#595959] bg-[#0D0D0D] p-6 sm:p-8 text-[#EDEDED] shadow-2xl">
            <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
            <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

            <div className="border-b border-[#2B2B2B] pb-3 mb-4 flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#818181] tracking-widest">[IDENTIFICAÇÃO]</span>
                <h3 className="font-syne text-xl font-bold uppercase tracking-tight text-[#EDEDED]">
                  Configuração do Atendente & Chave
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsKeyModalOpen(false)
                  setAuthModalOpen(false)
                }}
                className="font-mono text-xs text-[#818181] hover:text-[#EDEDED]"
              >
                [ESC]
              </button>
            </div>

            <div className="mb-4 border border-[#2B2B2B] bg-[#000000] p-3 text-xs font-mono text-[#A0A0A0] leading-relaxed flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-[#C6F432] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#EDEDED] block mb-1">Para que serve esta tela?</strong>
                Quando um cliente pede ajuda humana, é este nome que aparecerá para o cliente como o atendente responsável.
                Se você está testando localmente, não precisa preencher a chave de API.
              </div>
            </div>

            <form onSubmit={handleSaveAuth} className="space-y-4">
              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Seu Nome ou Apelido de Atendente
                </label>
                <Input
                  placeholder="Ex: Caio, Maria, Suporte-01"
                  value={tempOp}
                  maxLength={40}
                  onChange={(e) => setTempOp(e.target.value)}
                  className="w-full bg-[#000000]"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Identificação visível quando você responder a um cliente na fila humana (máx. 40 caracteres).
                </p>
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Chave de Acesso da API (Opcional)
                </label>
                <Input
                  type="password"
                  placeholder="Ex: dev-secret-key (deixe em branco se rodar localmente)"
                  value={tempKey}
                  maxLength={256}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="w-full bg-[#000000]"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Necessária apenas se o administrador configurou senha no servidor backend.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2B2B2B]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsKeyModalOpen(false)
                    setAuthModalOpen(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" variant="default">
                  Salvar Informações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toasts */}
      <Toaster />
    </div>
  )
}
