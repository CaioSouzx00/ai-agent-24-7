import { useEffect, useRef } from 'react'

interface DistortionCanvasProps {
  className?: string
  accentColor?: string
}

export function DistortionCanvas({
  className = '',
  accentColor = '#D4FF00',
}: DistortionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isHoveredRef = useRef(false)
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, speed: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 300)

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth
      height = canvas.height = canvas.parentElement.clientHeight
    }
    window.addEventListener('resize', onResize)

    let time = 0

    const render = () => {
      time += 0.03

      // Smooth mouse interpolation (lerp)
      const m = mouseRef.current
      m.x += (m.targetX - m.x) * 0.08
      m.y += (m.targetY - m.y) * 0.08

      ctx.fillStyle = '#050507'
      ctx.fillRect(0, 0, width, height)

      // Draw mathematical topographical grid waves
      const cols = 28
      const rows = 18
      const colStep = width / (cols - 1)
      const rowStep = height / (rows - 1)

      ctx.lineWidth = 1
      ctx.strokeStyle = '#1C1C24'

      for (let r = 0; r < rows; r++) {
        ctx.beginPath()
        for (let c = 0; c < cols; c++) {
          const baseX = c * colStep
          const baseY = r * rowStep

          // Distance to interactive pointer
          const dx = (baseX / width) - m.x
          const dy = (baseY / height) - m.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Distortion displacement formula
          const wave = Math.sin(dist * 12 - time * 2) * (1 / (dist + 0.15)) * 14
          const y = baseY + (isHoveredRef.current ? wave : Math.sin(baseX * 0.02 + time) * 4)

          if (c === 0) ctx.moveTo(baseX, y)
          else ctx.lineTo(baseX, y)
        }
        ctx.stroke()
      }

      // Draw subtle accent focal point
      if (isHoveredRef.current) {
        const px = m.x * width
        const py = m.y * height
        const grad = ctx.createRadialGradient(px, py, 2, px, py, 90)
        grad.addColorStop(0, `${accentColor}33`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(px - 90, py - 90, 180, 180)

        // Precision crosshair
        ctx.strokeStyle = accentColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px - 10, py)
        ctx.lineTo(px + 10, py)
        ctx.moveTo(px, py - 10)
        ctx.lineTo(px, py + 10)
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    const onMouseEnter = () => { isHoveredRef.current = true }
    const onMouseLeave = () => { isHoveredRef.current = false }
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width
      mouseRef.current.targetY = (e.clientY - rect.top) / rect.height
    }

    const parent = canvas.parentElement
    if (parent) {
      parent.addEventListener('mouseenter', onMouseEnter)
      parent.addEventListener('mouseleave', onMouseLeave)
      parent.addEventListener('mousemove', onMouseMove)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', onResize)
      if (parent) {
        parent.removeEventListener('mouseenter', onMouseEnter)
        parent.removeEventListener('mouseleave', onMouseLeave)
        parent.removeEventListener('mousemove', onMouseMove)
      }
    }
  }, [accentColor])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full pointer-events-none select-none ${className}`}
    />
  )
}
