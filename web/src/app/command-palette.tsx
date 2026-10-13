import { useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Command as CommandIcon,
  Moon,
  Sun,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui'
import { useAuthStore } from '@/shared/lib/auth-store'

export interface CommandPaletteProps {
  onNavigate: (path: string) => void
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useAuthStore()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (action: () => void) => {
    setOpen(false)
    action()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[15vh] p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="glass-panel w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-border/80">
        <Command>
          <CommandInput placeholder="Type a command or search..." autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => runCommand(() => onNavigate('/dashboard'))}>
                <Activity className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Dashboard & Telemetry</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => onNavigate('/handoff'))}>
                <Users className="mr-2 h-4 w-4 text-rose-400" />
                <span>Human Handoff Console</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => onNavigate('/chat'))}>
                <Bot className="mr-2 h-4 w-4 text-cyan-400" />
                <span>Agent Playground & Voice</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => onNavigate('/tools'))}>
                <Wrench className="mr-2 h-4 w-4 text-amber-400" />
                <span>Tool Catalogue</span>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Preferences">
              <CommandItem
                onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="mr-2 h-4 w-4 text-indigo-400" />
                )}
                <span>Toggle Theme (currently {theme})</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <CommandIcon className="h-3 w-3" /> Press <kbd className="rounded border bg-muted/60 px-1 font-mono">Esc</kbd> to close
          </div>
          <div>AI Agent 24/7 Command Center</div>
        </div>
      </div>
    </div>
  )
}
