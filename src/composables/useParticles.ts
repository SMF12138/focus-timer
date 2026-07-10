import { onUnmounted, type Ref } from 'vue'

export function useParticles(canvasRef: Ref<HTMLCanvasElement | null>) {
  let raf = 0
  let resizeHandler: (() => void) | null = null
  let running = false
  let animateFn: (() => void) | null = null

  function init() {
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

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      color: string
    }

    const particles: Particle[] = []
    const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#fbbf24']

    function resize() {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    function createParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      }
    }

    for (let i = 0; i < 80; i++) {
      particles.push(createParticle())
    }

    resize()
    resizeHandler = resize
    window.addEventListener('resize', resize)

    function animate() {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.002

        if (p.alpha <= 0 || p.y < 0 || p.x < 0 || p.x > width) {
          const np = createParticle()
          Object.assign(p, np)
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

  function cleanup() {
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
    animateFn = null
  }

  onUnmounted(cleanup)

  return {
    init,
    cleanup,
  }
}
