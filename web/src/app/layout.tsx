import { useState, type ReactNode } from 'react'
import {
  Activity,
  Bot,
  Key,
  Moon,
  Sun,
  Users,
  Wrench,
  Command as CommandIcon,
  Bot as RobotIcon,
  ShieldCheck,
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
  const { apiKey, setApiKey, operatorName, setOperatorName, theme, setTheme } = useAuthStore()
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)
  const [tempOp, setTempOp] = useState(operatorName)

  const navItems = [
    { label: 'Manifesto', path: '/', icon: ShieldCheck },
    { label: 'Dashboard', path: '/dashboard', icon: Activity },
    { label: 'Handoff Queue', path: '/handoff', icon: Users },
    { label: 'Playground', path: '/chat', icon: Bot },
    { label: 'Tools', path: '/tools', icon: Wrench },
  ]

  const handleSaveAuth = (e: React.FormEvent) => {
    e.preventDefault()
    setApiKey(tempKey.trim())
    setOperatorName(tempOp.trim() || 'human')
    setIsKeyModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/80 bg-background/80 px-6 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
              <RobotIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                AI Agent 24/7
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-indigo-500/30 text-indigo-400">
                  v0.2.0
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/dashboard')
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-accent/15 text-accent-foreground font-bold border border-accent/20'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : ''}`} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
              document.dispatchEvent(event)
            }}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-all"
          >
            <CommandIcon className="h-3 w-3" />
            <span>Search</span>
            <kbd className="rounded bg-muted/60 px-1 font-mono text-[10px]">Ctrl+K</kbd>
          </button>

          {/* Operator Badge & API Key Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempKey(apiKey)
              setTempOp(operatorName)
              setIsKeyModalOpen(true)
            }}
            className="h-8 gap-1.5 text-xs font-mono border-border/80"
          >
            <Key className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{operatorName}</span>
            {apiKey ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-amber-400">(no key)</span>
            )}
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 p-0"
            title="Toggle color theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-400" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">{children}</main>

      {/* Command Palette */}
      <CommandPalette onNavigate={onNavigate} />

      {/* API Key & Operator Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="glass-panel w-full max-w-md rounded-xl p-6 shadow-2xl border border-border/80">
            <h3 className="font-display text-lg font-bold text-foreground">API Key & Operator Profile</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure credentials for authenticated endpoints (`/chat`, `/handoff`, `/tools/dynamic`).
            </p>

            <form onSubmit={handleSaveAuth} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">API Key or Bearer Token</label>
                <Input
                  type="password"
                  placeholder="e.g. dev-secret-key or custom API key"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Leave empty if running locally without authentication.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Operator Name</label>
                <Input
                  placeholder="e.g. Caio, Alice, operator-1"
                  value={tempOp}
                  onChange={(e) => setTempOp(e.target.value)}
                  className="mt-1 text-xs"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Identifies you when claiming and replying to human handoff tickets.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsKeyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Settings
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
