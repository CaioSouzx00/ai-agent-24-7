import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-xs font-mono uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-40 rounded-none active:translate-y-[1px]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-black font-bold hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] shadow-none',
        destructive: 'border border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/40',
        outline: 'border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
        secondary: 'border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)]',
        ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]',
        link: 'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
        glow: 'border border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black font-bold hover:shadow-[0_0_20px_var(--accent-glow)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-[11px]',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
