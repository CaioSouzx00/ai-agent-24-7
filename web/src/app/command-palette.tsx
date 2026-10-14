import { useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Command as CommandIcon,
  Users,
  Wrench,
  Terminal,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui'

export interface CommandPaletteProps {
  onNavigate: (path: string) => void
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-[15vh] p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-lg border border-[#595959] bg-[#0D0D0D] text-[#EDEDED] shadow-2xl overflow-hidden">
        <span className="absolute top-0 right-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>
        <span className="absolute bottom-0 left-0 text-[10px] font-mono text-[#595959] p-2 leading-none pointer-events-none">+</span>

        <Command className="bg-transparent text-[#EDEDED]">
          <CommandInput
            placeholder="TYPE COMMAND OR DIRECTIVE (e.g. /dashboard, /chat)..."
            autoFocus
            className="border-b border-[#2B2B2B] bg-[#000000] font-mono text-xs text-[#EDEDED] placeholder:text-[#818181] h-12"
          />
          <CommandList className="max-h-[300px] p-2 font-mono text-xs">
            <CommandEmpty className="p-4 text-center text-[#818181]">
              // NO DIRECTIVES MATCH QUERY
            </CommandEmpty>

            <CommandGroup heading="// DIRECTORY DISPATCH">
              <CommandItem
                onSelect={() => runCommand(() => onNavigate('/'))}
                className="cursor-pointer hover:bg-[#1A1A1A] hover:text-[#C6F432] p-2 transition-colors"
              >
                <Terminal className="mr-2 h-3.5 w-3.5 text-[#818181]" />
                <span>[00] MANIFESTO // EDITORIAL SHOWCASE</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => onNavigate('/dashboard'))}
                className="cursor-pointer hover:bg-[#1A1A1A] hover:text-[#C6F432] p-2 transition-colors"
              >
                <Activity className="mr-2 h-3.5 w-3.5 text-[#818181]" />
                <span>[01] TELEMETRY // OPERATIONS & METRICS</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => onNavigate('/handoff'))}
                className="cursor-pointer hover:bg-[#1A1A1A] hover:text-[#C6F432] p-2 transition-colors"
              >
                <Users className="mr-2 h-3.5 w-3.5 text-[#818181]" />
                <span>[02] HANDOFF // HUMAN TRIAGE COCKPIT</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => onNavigate('/chat'))}
                className="cursor-pointer hover:bg-[#1A1A1A] hover:text-[#C6F432] p-2 transition-colors"
              >
                <Bot className="mr-2 h-3.5 w-3.5 text-[#818181]" />
                <span>[03] CONSOLE // AUTONOMOUS AGENT PLAYGROUND</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => onNavigate('/tools'))}
                className="cursor-pointer hover:bg-[#1A1A1A] hover:text-[#C6F432] p-2 transition-colors"
              >
                <Wrench className="mr-2 h-3.5 w-3.5 text-[#818181]" />
                <span>[04] TOOL MATRIX // REASONING CAPABILITIES</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="flex items-center justify-between border-t border-[#2B2B2B] bg-[#000000] px-4 py-2 font-mono text-[10px] text-[#818181]">
          <div className="flex items-center gap-1.5">
            <CommandIcon className="h-3 w-3" />
            <span>PRESS [ESC] TO CLOSE</span>
          </div>
          <span>AGNT-247 TERMINAL PALETTE</span>
        </div>
      </div>
    </div>
  )
}
