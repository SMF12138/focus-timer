import { type Ref } from 'vue'

interface FireworkParticle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  decay: number
  color: string
  size: number
}

export function useFireworks(canvasRef: Ref<HTMLCanvasElement | null>) {
  let raf = 0
  let resizeHandler: (() => void) | null = null
  let fireworks: FireworkParticle[] = []
  let running = false
  let animateFn: (() => void) | null = null

  function start() {
    if (running) return
    running = true

    const canvas = canvasRef.value as HTMLCanvasElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!canvas || !ctx) {
      running = false
      return
    }

    let width = 0
    let height = 0

    function resize() {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    resize()
    resizeHandler = resize
    window.addEventListener('resize', resize)

    const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb7185']
    const MAX_PARTICLES = 600

    function explode(cx: number, cy: number) {
      if (fireworks.length > MAX_PARTICLES) return
      const count = 60
      for (let i = 0; i < count; i++) {
        if (fireworks.length >= MAX_PARTICLES) break
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = Math.random() * 5 + 3
        fireworks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 2 + 1.5,
        })
      }
    }

    let frame = 0
    function animate() {
      ctx.clearRect(0, 0, width, height)

      if (frame % 20 === 0) {
        explode(Math.random() * width, Math.random() * height * 0.6)
      }
      frame++

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const p = fireworks[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.vx *= 0.98
        p.alpha -= p.decay

        if (p.alpha <= 0) {
          fireworks.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(animate)
    }

    animateFn = animate
    animate()
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    } else if (animateFn) {
      animateFn()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  function stop() {
    running = false
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
    fireworks = []
    animateFn = null
  }

  return {
    start,
    stop,
  }
}
