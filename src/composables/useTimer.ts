import { ref, computed } from 'vue'

const remaining = ref(0)
const total = ref(0)

export function useTimer() {
  const display = computed(() => {
    const r = Math.max(0, remaining.value)
    const m = Math.floor(r / 60)
      .toString()
      .padStart(2, '0')
    const s = (r % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  const progress = computed(() => {
    if (!total.value) return 0
    return Math.min(1, Math.max(0, remaining.value / total.value))
  })

  function setTimer(r: number, t: number) {
    remaining.value = Math.max(0, r)
    total.value = Math.max(0, t)
  }

  function reset() {
    remaining.value = 0
    total.value = 0
  }

  return {
    remaining,
    total,
    display,
    progress,
    setTimer,
    reset,
  }
}
