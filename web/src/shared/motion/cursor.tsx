import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false)
  const [cursorType, setCursorType] = useState<string | null>(null)
  const [cursorLabel, setCursorLabel] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Direct mouse positions
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  // Smooth springs with editorial snappy inertia
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 }
  const ringX = useSpring(mouseX, springConfig)
  const ringY = useSpring(mouseY, springConfig)

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(hover: none)').matches) {
      setIsTouchDevice(true)
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!isVisible) setIsVisible(true)

      // Identify interactive targets
      const target = e.target as HTMLElement | null
      if (!target) return

      const customEl = target.closest('[data-cursor]') as HTMLElement | null
      const buttonEl = target.closest('button, a, input, textarea, [role="button"]')

      if (customEl) {
        const type = customEl.getAttribute('data-cursor') || 'hover'
        const label = customEl.getAttribute('data-cursor-label') || ''
        setCursorType(type)
        setCursorLabel(label)
      } else if (buttonEl) {
        setCursorType('interactive')
        setCursorLabel(null)
      } else {
        setCursorType(null)
        setCursorLabel(null)
      }
    }

    const onMouseLeave = () => setIsVisible(false)
    const onMouseEnter = () => setIsVisible(true)

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [isVisible, mouseX, mouseY])

  if (isTouchDevice || !isVisible) return null

  const isInteractive = cursorType === 'interactive'
  const isCustom = cursorType !== null && cursorType !== 'interactive'

  return (
    <div className="pointer-events-none fixed inset-0 z-[10000] overflow-hidden">
      {/* Precision Center Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isInteractive || isCustom ? 0 : 1,
          opacity: isInteractive || isCustom ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
        className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
      />

      {/* Fluid Outer Ring */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isCustom ? 84 : isInteractive ? 52 : 32,
          height: isCustom ? 84 : isInteractive ? 52 : 32,
          borderColor: isCustom || isInteractive ? 'var(--accent)' : 'var(--border-strong)',
          backgroundColor: isCustom
            ? 'rgba(198, 244, 50, 0.12)'
            : isInteractive
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0)',
        }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 260,
          mass: 0.4,
        }}
        className="flex items-center justify-center rounded-full border border-dashed backdrop-blur-[1px]"
      >
        {cursorLabel && (
          <span className="font-mono text-[9px] font-bold tracking-widest text-[var(--accent)] uppercase select-none">
            {cursorLabel}
          </span>
        )}
      </motion.div>
    </div>
  )
}
