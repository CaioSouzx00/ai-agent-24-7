import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface SplitTextProps {
  children: string
  className?: string
  delay?: number
  stagger?: number
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
  once?: boolean
}

const EASE_EDITORIAL = [0.76, 0, 0.24, 1] as const

export function SplitText({
  children,
  className = '',
  delay = 0,
  stagger = 0.04,
  as: Component = 'div',
  once = true,
}: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: '-10% 0px' })

  // Split into words while preserving line-break structure if any
  const words = children.split(' ')

  return (
    <Component ref={ref as any} className={`overflow-hidden ${className}`}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-top"
          style={{ paddingBottom: '0.08em', marginRight: '0.22em' }}
        >
          <motion.span
            className="inline-block"
            initial={{ y: '120%', opacity: 0 }}
            animate={isInView ? { y: '0%', opacity: 1 } : { y: '120%', opacity: 0 }}
            transition={{
              duration: 0.85,
              ease: EASE_EDITORIAL,
              delay: delay + i * stagger,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Component>
  )
}
