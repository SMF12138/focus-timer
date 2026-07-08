<template>
  <div class="timer" :class="{ urgent: isUrgent, finished: finished }">
    <!-- Aurora background -->
    <div class="aurora-bg">
      <div class="aurora aurora-1"></div>
      <div class="aurora aurora-2"></div>
      <div class="aurora aurora-3"></div>
      <div class="aurora aurora-4"></div>
    </div>

    <!-- Particle canvas -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- Fireworks canvas -->
    <canvas v-show="finished" ref="fireworkCanvas" class="firework-canvas"></canvas>

    <!-- Fish pond -->
  <FishPond mode="orbit" />

  <div class="content">
      <div class="ring-wrapper">
        <svg class="ring" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0ea5e9" />
              <stop offset="50%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#818cf8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle class="track" cx="50" cy="50" r="45" />
          <circle
            class="progress"
            cx="50"
            cy="50"
            r="45"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="offset"
          />
        </svg>
        <div class="time">{{ display }}</div>
      </div>
    </div>

    <div v-if="finished" class="finish-modal">
      <div class="finish-card">
        <div class="finish-icon">🎉</div>
        <h2 class="finish-title">专注时间到</h2>
        <p class="finish-subtitle">休息一下吧，你已完成本次专注</p>
        <button class="confirm-btn" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTimer } from '../composables/useTimer'
import FishPond from '../components/FishPond.vue'

const { remaining, total, display, progress } = useTimer()
const finished = ref(false)
const radius = 45
const circumference = 2 * Math.PI * radius

const offset = computed(() => circumference * (1 - progress.value))
const isUrgent = computed(() => remaining.value <= 10 && remaining.value > 0)

const particleCanvas = ref<HTMLCanvasElement | null>(null)
const fireworkCanvas = ref<HTMLCanvasElement | null>(null)

let particleRaf = 0
let fireworkRaf = 0

onMounted(() => {
  window.electronAPI?.onTimerUpdate?.(({ remaining: r, total: t }) => {
    remaining.value = r
    total.value = t
  })

  window.electronAPI?.onTimerFinished?.(() => {
    finished.value = true
    playBeep()
    startFireworks()
  })

  initParticles()
})

onUnmounted(() => {
  cancelAnimationFrame(particleRaf)
  cancelAnimationFrame(fireworkRaf)
})

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (err) {
    console.warn('Audio playback failed:', err)
  }
}

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = 0
  let height = 0
  const particles: Array<{
    x: number
    y: number
    vx: number
    vy: number
    size: number
    alpha: number
    color: string
  }> = []

  const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#fbbf24']

  function resize() {
    width = canvas!.width = window.innerWidth
    height = canvas!.height = window.innerHeight
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
  window.addEventListener('resize', resize)

  function animate() {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.alpha -= 0.002

      if (p.alpha <= 0 || p.y < 0 || p.x < 0 || p.x > width) {
        const np = createParticle()
        p.x = np.x
        p.y = np.y
        p.vx = np.vx
        p.vy = np.vy
        p.size = np.size
        p.alpha = np.alpha
        p.color = np.color
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha
      ctx.fill()
    }

    ctx.globalAlpha = 1
    particleRaf = requestAnimationFrame(animate)
  }

  animate()
}

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

let fireworks: FireworkParticle[] = []

function startFireworks() {
  const canvas = fireworkCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = 0
  let height = 0

  function resize() {
    width = canvas!.width = window.innerWidth
    height = canvas!.height = window.innerHeight
  }

  resize()
  window.addEventListener('resize', resize)

  const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb7185']

  function explode(cx: number, cy: number) {
    const count = 60
    for (let i = 0; i < count; i++) {
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
    if (!ctx) return
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
    fireworkRaf = requestAnimationFrame(animate)
  }

  animate()
}

function onConfirm() {
  finished.value = false
  fireworks = []
  cancelAnimationFrame(fireworkRaf)
  window.electronAPI?.finishAck?.()
}
</script>

<style scoped lang="scss">
.timer {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  overflow: hidden;
}

.aurora-bg {
  position: absolute;
  inset: -50%;
  z-index: 0;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.8;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  animation: auroraFloat 25s ease-in-out infinite;
}

.aurora-1 {
  width: 70vw;
  height: 70vw;
  top: 0;
  left: 10%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.45), transparent 60%);
  animation-delay: 0s;
}

.aurora-2 {
  width: 60vw;
  height: 60vw;
  top: 30%;
  right: 0;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent 60%);
  animation-delay: -8s;
}

.aurora-3 {
  width: 55vw;
  height: 55vw;
  bottom: 0;
  left: 25%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 60%);
  animation-delay: -16s;
}

.aurora-4 {
  width: 50vw;
  height: 50vw;
  bottom: 20%;
  right: 15%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.25), transparent 60%);
  animation-delay: -5s;
}

@keyframes auroraFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(6%, -8%) scale(1.08);
  }
  50% {
    transform: translate(-5%, 5%) scale(0.95);
  }
  75% {
    transform: translate(4%, 3%) scale(1.03);
  }
}

.particle-canvas,
.firework-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-wrapper {
  position: relative;
  width: min(75vw, 560px);
  height: min(75vw, 560px);
  filter: drop-shadow(0 0 24px rgba(56, 189, 248, 0.25));
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 4;
}

.progress {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
  filter: url(#glow);
}

.time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(4rem, 13vw, 10rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -4px;
  color: #f0f9ff;
  text-shadow:
    0 0 20px rgba(56, 189, 248, 0.35),
    0 0 40px rgba(56, 189, 248, 0.15);
}

.urgent .time {
  animation: neonPulse 1s ease-in-out infinite;
  color: #fef3c7;
  text-shadow:
    0 0 20px rgba(251, 191, 36, 0.5),
    0 0 40px rgba(251, 191, 36, 0.25);
}

.urgent .ring-wrapper {
  animation: ringShake 0.6s ease-in-out infinite;
  filter: drop-shadow(0 0 32px rgba(251, 191, 36, 0.4));
}

@keyframes neonPulse {
  0%, 100% {
    opacity: 1;
    text-shadow:
      0 0 20px rgba(251, 191, 36, 0.5),
      0 0 40px rgba(251, 191, 36, 0.25);
  }
  50% {
    opacity: 0.85;
    text-shadow:
      0 0 30px rgba(251, 191, 36, 0.7),
      0 0 60px rgba(251, 191, 36, 0.35);
  }
}

@keyframes ringShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-2px); }
  40%, 80% { transform: translateX(2px); }
}

.finish-modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 16, 32, 0.85);
  backdrop-filter: blur(16px);
  z-index: 100;
  animation: popIn 0.5s ease-out;
}

.finish-card {
  position: relative;
  z-index: 101;
  width: min(90%, 460px);
  padding: clamp(40px, 5vh, 56px) clamp(32px, 4vw, 48px);
  border-radius: 28px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  text-align: center;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(52, 211, 153, 0.15);
  animation: cardGlow 2s ease-in-out infinite;
}

.finish-icon {
  font-size: clamp(48px, 8vw, 64px);
  margin-bottom: 16px;
  animation: bounce 1s ease-in-out infinite;
}

.finish-title {
  margin: 0 0 10px;
  font-size: clamp(24px, 4vw, 32px);
  color: #e0f2fe;
}

.finish-subtitle {
  margin: 0 0 32px;
  color: var(--text-muted);
  font-size: clamp(14px, 1.8vw, 16px);
}

.confirm-btn {
  width: 100%;
  padding: clamp(16px, 2.5vh, 20px) 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: #0b1020;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 700;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 24px rgba(52, 211, 153, 0.3);
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(52, 211, 153, 0.4);
}

@keyframes cardGlow {
  0%, 100% {
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.4),
      0 0 60px rgba(52, 211, 153, 0.15);
  }
  50% {
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.4),
      0 0 80px rgba(52, 211, 153, 0.25);
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
