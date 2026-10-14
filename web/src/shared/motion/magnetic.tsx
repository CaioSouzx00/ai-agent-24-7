import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  pullStrength?: number // Fraction of pull towards cursor (0.25 = subtle, 0.4 = strong)
  className?: string
}

export function MagneticButton({
  children,
  pullStrength = 0.3,
  className = '',
  onClick,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2

    const deltaX = (e.clientX - centerX) * pullStrength
    const deltaY = (e.clientY - centerY) * pullStrength

    setPosition({ x: deltaX, y: deltaY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 220,
        mass: 0.2,
      }}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}
