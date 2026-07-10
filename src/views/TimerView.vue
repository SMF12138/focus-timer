<template>
  <div class="timer" :class="{ urgent: isUrgent, finished: finished }">
    <AuroraBg :count="4" />

    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
    <canvas v-show="finished" ref="fireworkCanvas" class="firework-canvas"></canvas>

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
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
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
        <div class="time" aria-live="polite" aria-atomic="true">
        <FlipClock :time="display" size="min(13vw, 10rem)" />
      </div>
      </div>
    </div>

    <div
      v-if="finished"
      class="finish-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
    >
      <div class="finish-card">
        <div class="finish-icon">🎉</div>
        <h2 id="finish-title" class="finish-title">专注时间到</h2>
        <p class="finish-subtitle">休息一下吧，你已完成本次专注</p>
        <button ref="confirmBtn" class="confirm-btn" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTimer } from '../composables/useTimer'
import { useParticles } from '../composables/useParticles'
import { useFireworks } from '../composables/useFireworks'
import FishPond from '../components/FishPond.vue'
import AuroraBg from '../components/AuroraBg.vue'
import FlipClock from '../components/FlipClock.vue'

const { remaining, display, progress, setTimer, reset } = useTimer()
const particleCanvas = ref<HTMLCanvasElement | null>(null)
const fireworkCanvas = ref<HTMLCanvasElement | null>(null)
const { init: initParticles, cleanup: cleanupParticles } = useParticles(particleCanvas)
const { start: startFireworks, stop: stopFireworks } = useFireworks(fireworkCanvas)

const finished = ref(false)
const confirmBtn = ref<HTMLButtonElement | null>(null)
const radius = 45
const circumference = 2 * Math.PI * radius

const offset = computed(() => circumference * (1 - progress.value))
const isUrgent = computed(() => remaining.value <= 10 && remaining.value > 0)

let removeTimerUpdate: (() => void) | null = null
let removeTimerFinished: (() => void) | null = null

onMounted(() => {
  removeTimerUpdate = window.electronAPI?.onTimerUpdate?.(({ remaining: r, total: t }) => {
    setTimer(r, t)
  }) ?? null

  removeTimerFinished = window.electronAPI?.onTimerFinished?.(() => {
    finished.value = true
    playBeep()
    startFireworks()
  }) ?? null

  initParticles()
})

onUnmounted(() => {
  removeTimerUpdate?.()
  removeTimerFinished?.()
  cleanupParticles()
  stopFireworks()
})

watch(finished, (value) => {
  if (value) {
    nextTick(() => confirmBtn.value?.focus())
  }
})

function playBeep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        ctx.close().catch(() => {})
      })
    }
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
    setTimeout(() => ctx.close().catch(() => {}), 700)
  } catch (err) {
    console.warn('Audio playback failed:', err)
  }
}

function onConfirm() {
  finished.value = false
  stopFireworks()
  reset()
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
  border-radius: 50%;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 4;
  filter: url(#softGlow);
}

.progress {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
  filter: url(#glow);
}

.timer.finished .progress {
  animation: ringPulse 1.2s ease-in-out infinite;
}

@keyframes ringPulse {
  0%, 100% {
    filter: url(#glow);
  }
  50% {
    filter: url(#glowStrong);
  }
}

.timer.finished .time {
  animation: timeBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes timeBounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.timer.finished .ring-wrapper {
  animation: ringFinish 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes ringFinish {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
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
  animation: modalReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
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
  animation: cardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s backwards;
}

@keyframes modalReveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cardPop {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(30px);
  }
  60% {
    transform: scale(1.04) translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
