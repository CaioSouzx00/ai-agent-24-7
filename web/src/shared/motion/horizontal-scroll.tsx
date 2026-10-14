import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface HorizontalScrollItem {
  number: string
  phase: string
  title: string
  spec: string
  description: string
  latency: string
}

interface HorizontalScrollSectionProps {
  items: HorizontalScrollItem[]
}

export function HorizontalScrollSection({ items }: HorizontalScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Horizontal translation tied strictly to vertical scroll
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-68%'])

  return (
    <section ref={containerRef} className="relative h-[320vh] bg-[var(--bg)]">
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-6 py-10 md:px-16 md:py-14">
        {/* Top Header of Pinned Section */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[var(--accent)]">
            <span className="h-1.5 w-1.5 bg-[var(--accent)]" />
            <span>[02 // COGNITIVE PIPELINE EXECUTION PINNED MATRIX]</span>
          </div>
          <div className="hidden font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] md:block">
            <span>SCROLL DOWN TO PROGRESS INTERNALS // PINNED STAGE</span>
          </div>
        </div>

        {/* Sliding Horizontal Rail */}
        <div className="my-auto overflow-hidden">
          <motion.div style={{ x }} className="flex gap-8 md:gap-14 will-change-transform">
            {items.map((item, index) => (
              <div
                key={index}
                data-cursor="inspect"
                data-cursor-label="STAGE"
                className="group relative flex h-[480px] w-[85vw] md:w-[580px] flex-shrink-0 flex-col justify-between border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 transition-colors duration-500 hover:border-[var(--border-strong)]"
              >
                {/* Stage Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-semibold tracking-widest text-[var(--accent)] uppercase">
                      {item.phase}
                    </span>
                    <span className="font-mono text-2xl font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      {item.number}
                    </span>
                  </div>
                  <h3 className="mt-8 font-syne text-3xl md:text-4xl font-bold uppercase tracking-tight text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                </div>

                {/* Technical Metric & Body */}
                <div className="space-y-4">
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <div className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-1">
                      BENCHMARK SPECIFICATION
                    </div>
                    <div className="font-mono text-xs text-[var(--accent)] font-medium">
                      {item.spec}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)]">
                    <span>EXECUTION TIME</span>
                    <span className="text-[var(--text-primary)]">{item.latency}</span>
                  </div>
                </div>

                {/* Subtle corner marker ornament */}
                <div className="absolute top-0 right-0 h-2 w-2 border-t border-r border-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Progress Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 font-mono text-[11px] text-[var(--text-muted)] uppercase tracking-widest">
          <span>PIPELINE 01 — 04</span>
          <div className="flex items-center gap-4">
            <span>DRAG / SCROLL TO NAVIGATE</span>
          </div>
        </div>
      </div>
    </section>
  )
}
