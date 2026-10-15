import { useEffect, useRef } from 'react'

// Fixed, full-viewport canvas: a small number of soft, glowing dots drifting
// slowly, plus one faint continuous wave line. Deliberately understated —
// this sits behind glass UI on every page, so it should read as ambient
// motion, not a light show. Pure canvas 2D, no dependency, respects
// prefers-reduced-motion.
export default function ParticleField({ density = 0.55 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width, height, dpr
    let particles = []
    let raf
    let mouse = { x: -9999, y: -9999 }

    const COLORS = ['rgba(75, 243, 214,', 'rgba(141, 253, 230,', 'rgba(139, 92, 246,']

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round(((width * height) / 22000) * density)
      particles = Array.from({ length: Math.min(count, 55) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.3 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
      }))
    }

    function step(t) {
      ctx.clearRect(0, 0, width, height)

      drawWave(ctx, width, height, t * 0.00004, 0.07)
      drawWave(ctx, width, height, t * 0.00004 + Math.PI, 0.045, 0.62)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.pulse += 0.008

        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20

        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist2 = dx * dx + dy * dy
        if (dist2 < 9000) {
          const f = (9000 - dist2) / 9000
          p.x -= dx * f * 0.012
          p.y -= dy * f * 0.012
        }
      }

      for (const p of particles) {
        const glow = 0.4 + Math.sin(p.pulse) * 0.25
        ctx.beginPath()
        ctx.fillStyle = `${p.color}${glow})`
        ctx.shadowColor = `${p.color}0.6)`
        ctx.shadowBlur = 4
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      if (!prefersReduced) raf = requestAnimationFrame(step)
    }

    // A single soft sine wave sweeping the width of the screen -- the
    // "continuously flowing" line effect, kept intentionally faint.
    function drawWave(ctx, w, h, phase, opacity, verticalFrac = 0.38) {
      const amp = Math.min(h * 0.05, 46)
      const baseY = h * verticalFrac
      const steps = 60
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w
        const y = baseY + Math.sin(x * 0.006 + phase * 60) * amp
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(75, 243, 214, ${opacity})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY }
    function onLeave() { mouse.x = -9999; mouse.y = -9999 }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    if (prefersReduced) {
      step(0)
    } else {
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-60"
    />
  )
}
