<template>
  <div class="setup">
    <AuroraBg />

    <FishPond mode="free" />

    <div class="card">
      <h1 class="title">专注计时器</h1>
      <p class="subtitle">选择或输入专注时长</p>

      <div class="presets">
        <button
          v-for="m in presets"
          :key="m"
          class="preset-btn"
          :class="{ active: minutes === m && seconds === 0 }"
          @click="selectPreset(m)"
        >
          {{ m }} 分钟
        </button>
      </div>

      <div class="custom-row">
        <div class="field">
          <label for="minutes-input">分钟</label>
          <input
            id="minutes-input"
            v-model.number="minutes"
            type="number"
            min="0"
            max="999"
            @input="sanitizeMinutes"
          />
        </div>
        <span class="colon">:</span>
        <div class="field">
          <label for="seconds-input">秒</label>
          <input
            id="seconds-input"
            v-model.number="seconds"
            type="number"
            min="0"
            max="59"
            @input="sanitizeSeconds"
          />
        </div>
      </div>

      <button class="start-btn" @click="start">开始专注</button>
      <button class="quit-btn" @click="quit">退出应用</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FishPond from '../components/FishPond.vue'
import AuroraBg from '../components/AuroraBg.vue'

const presets = [5, 10, 15, 25, 45]
const minutes = ref(25)
const seconds = ref(0)

function selectPreset(m: number) {
  minutes.value = m
  seconds.value = 0
}

function sanitizeMinutes() {
  minutes.value = clampInt(minutes.value, 0, 999)
}

function sanitizeSeconds() {
  seconds.value = clampInt(seconds.value, 0, 59)
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value || 0)))
}

function start() {
  sanitizeMinutes()
  sanitizeSeconds()
  const totalSeconds = minutes.value * 60 + seconds.value
  if (totalSeconds <= 0) return
  window.electronAPI?.startTimer?.(totalSeconds)
}

function quit() {
  window.electronAPI?.quitApp?.()
}
</script>

<style scoped lang="scss">
.setup {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--bg);
  overflow: hidden;
}

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  padding: clamp(40px, 6vh, 72px) clamp(32px, 5vw, 64px);
  border-radius: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  backdrop-filter: blur(24px);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  text-align: center;
  animation: popIn 0.5s ease-out;
}

.title {
  margin: 0 0 12px;
  font-size: clamp(36px, 5vw, 52px);
  font-weight: 800;
  letter-spacing: -1.5px;
  background: linear-gradient(135deg, #e0f2fe, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(56, 189, 248, 0.2);
}

.subtitle {
  margin: 0 0 40px;
  color: var(--text-muted);
  font-size: clamp(14px, 1.8vw, 18px);
}

.presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}

.preset-btn {
  padding: clamp(12px, 2vh, 16px) 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: clamp(13px, 1.5vw, 16px);
  transition: all 0.25s;
}

.preset-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.preset-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: var(--accent);
  color: #e0f2fe;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.15);
}

.custom-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.field label {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.field input {
  width: clamp(88px, 12vw, 120px);
  text-align: center;
  font-size: clamp(22px, 2.5vw, 30px);
  font-weight: 600;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.colon {
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 300;
  color: var(--text-muted);
  margin-bottom: 18px;
}

.start-btn {
  width: 100%;
  padding: clamp(16px, 2.5vh, 20px) 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #0b1020;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 700;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.25);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(56, 189, 248, 0.4);
}

.start-btn:active {
  transform: translateY(0);
}

.quit-btn {
  width: 100%;
  margin-top: 16px;
  padding: clamp(12px, 2vh, 16px) 24px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 500;
  transition: all 0.2s;
}

.quit-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e0f2fe;
  border-color: rgba(255, 255, 255, 0.2);
}
</style>

