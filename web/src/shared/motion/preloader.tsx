import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PreloaderProps {
  onComplete: () => void
}

const EASE_EDITORIAL = [0.76, 0, 0.24, 1] as const

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    // Non-linear realistic kernel boot simulation
    let current = 0
    const steps = [
      { target: 18, delay: 120 },
      { target: 42, delay: 240 },
      { target: 71, delay: 380 },
      { target: 93, delay: 520 },
      { target: 100, delay: 720 },
    ]

    let stepIndex = 0

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const nextTarget = steps[stepIndex].target
        current += Math.max(1, Math.floor((nextTarget - current) * 0.45))
        if (current >= nextTarget) {
          current = nextTarget
          stepIndex++
        }
        setProgress(current)
      } else {
        clearInterval(interval)
        setTimeout(() => {
          setIsDone(true)
          setTimeout(onComplete, 850)
        }, 150)
      }
    }, 38)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ y: '0%' }}
          exit={{
            y: '-100%',
            transition: { duration: 0.9, ease: EASE_EDITORIAL },
          }}
          className="fixed inset-0 z-[99999] flex flex-col justify-between bg-[var(--bg)] p-6 md:p-12 text-[var(--text-primary)] select-none"
        >
          {/* Top Bar Status */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 font-mono text-xs tracking-widest text-[var(--text-muted)] uppercase">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
              <span>SYS.BOOT // KERNEL 0.3.0</span>
            </div>
            <div className="hidden md:block">
              <span>LAT 37.7749° N — LON 122.4194° W</span>
            </div>
            <div>
              <span>INITIALIZING SHARDS</span>
            </div>
          </div>

          {/* Central Massive Counter & Label */}
          <div className="my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <span className="block font-mono text-xs uppercase tracking-widest text-[var(--accent)] mb-2">
                [00 // SYSTEM INITIALIZATION RUNTIME]
              </span>
              <h2 className="font-syne text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
                Autonomous Cognitive Engine
              </h2>
            </div>
            <div className="md:col-span-4 text-left md:text-right">
              <span className="font-mono text-7xl md:text-[9.5rem] font-bold leading-none tracking-tighter text-[var(--text-primary)] tabular-nums">
                {String(progress).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Bottom Diagnostics & Hairline Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
              <span>LANGGRAPH DETERMINISTIC DECISION GRAPH</span>
              <span className="text-[var(--accent)]">
                {progress < 100 ? 'CONNECTING NVIDIA NIM...' : 'SYSTEM ARMED & SECURE'}
              </span>
            </div>
            {/* Hairline Progress Bar */}
            <div className="h-[2px] w-full overflow-hidden bg-[var(--surface-2)]">
              <motion.div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
