import { useState, type ReactNode } from 'react'
import {
  Activity,
  Bot,
  Key,
  Users,
  Wrench,
  Command as CommandIcon,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { Button, Input, Toaster, Badge } from '@/shared/ui'
import { useAuthStore } from '@/shared/lib/auth-store'
import { CommandPalette } from './command-palette'

export interface LayoutProps {
  children: ReactNode
  currentPath: string
  onNavigate: (path: string) => void
}

export function AppLayout({ children, currentPath, onNavigate }: LayoutProps) {
  const { apiKey, setApiKey, operatorName, setOperatorName } = useAuthStore()
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)
  const [tempOp, setTempOp] = useState(operatorName)

  const navItems = [
    { num: '00', label: 'MANIFESTO', path: '/', icon: Terminal },
    { num: '01', label: 'TELEMETRY', path: '/dashboard', icon: Activity },
    { num: '02', label: 'HANDOFF', path: '/handoff', icon: Users },
    { num: '03', label: 'CONSOLE', path: '/chat', icon: Bot },
    { num: '04', label: 'TOOL MATRIX', path: '/tools', icon: Wrench },
  ]

  const handleSaveAuth = (e: React.FormEvent) => {
    e.preventDefault()
    setApiKey(tempKey.trim())
    setOperatorName(tempOp.trim() || 'human')
    setIsKeyModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#EDEDED] flex flex-col font-sans selection:bg-[#C6F432] selection:text-black">
      {/* Top Hairline Telemetry Bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#2B2B2B] bg-[#000000]/90 px-4 md:px-8 backdrop-blur-md">
        {/* Brand & Kernel Status */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate('/')}
            data-cursor
            data-cursor-label="home"
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#EDEDED] font-bold group-hover:text-[#C6F432] transition-colors">
                SYS // AGNT-247
              </span>
            </div>
            <span className="hidden sm:inline-block font-mono text-[10px] text-[#818181] border border-[#2B2B2B] px-1.5 py-0.2">
              v0.2.0-STABLE
            </span>
          </div>

          {/* Navigation Links */}
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
                  data-cursor-label="navigate"
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
        <div className="flex items-center gap-3">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
              document.dispatchEvent(event)
            }}
            data-cursor
            data-cursor-label="search"
            className="hidden sm:flex items-center gap-2 border border-[#2B2B2B] bg-[#0D0D0D] px-2.5 py-1 font-mono text-xs text-[#818181] hover:border-[#595959] hover:text-[#EDEDED] transition-colors"
          >
            <CommandIcon className="h-3 w-3" />
            <span className="text-[11px]">COMMAND</span>
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
            data-cursor-label="auth"
            className="flex items-center gap-1.5 border border-[#2B2B2B] bg-[#0D0D0D] px-2.5 py-1 font-mono text-xs text-[#EDEDED] hover:border-[#595959] transition-colors"
          >
            <Key className="h-3 w-3 text-[#C6F432]" />
            <span className="hidden sm:inline uppercase text-[11px]">{operatorName}</span>
            {apiKey ? (
              <span className="text-[9px] font-mono text-[#C6F432]">[AUTHED]</span>
            ) : (
              <span className="text-[9px] font-mono text-amber-400">[NO-KEY]</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden bg-[#000000]">{children}</main>

      {/* Command Palette */}
      <CommandPalette onNavigate={onNavigate} />

      {/* API Key & Operator Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-[#595959] bg-[#0D0D0D] p-6 text-[#EDEDED] shadow-2xl">
            <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>
            <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none">+</span>

            <div className="border-b border-[#2B2B2B] pb-3 mb-4">
              <span className="font-mono text-[10px] uppercase text-[#818181] tracking-widest">[SECURITY PROTOCOL]</span>
              <h3 className="font-syne text-lg font-bold uppercase tracking-tight text-[#EDEDED]">
                Operator Credentials
              </h3>
            </div>

            <p className="font-mono text-xs text-[#818181] leading-relaxed mb-4">
              Configure credentials for authenticated endpoints (/chat, /handoff, /tools/dynamic).
            </p>

            <form onSubmit={handleSaveAuth} className="space-y-4">
              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  API Key or Bearer Token
                </label>
                <Input
                  type="password"
                  placeholder="e.g. dev-secret-key"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="w-full"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Leave empty if running locally without bearer authentication.
                </p>
              </div>

              <div>
                <label className="font-mono text-xs text-[#818181] uppercase block mb-1">
                  Operator Signature ID
                </label>
                <Input
                  placeholder="e.g. Caio, operator-01"
                  value={tempOp}
                  onChange={(e) => setTempOp(e.target.value)}
                  className="w-full"
                />
                <p className="mt-1 font-mono text-[10px] text-[#818181]">
                  Tag affixed to human handoff claims and overrides.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2B2B2B]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsKeyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default">
                  Save Credentials
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
