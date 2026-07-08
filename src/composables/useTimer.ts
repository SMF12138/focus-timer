import { ref, computed } from 'vue'

const remaining = ref(0)
const total = ref(0)

export function useTimer() {
  const display = computed(() => {
    const m = Math.floor(remaining.value / 60)
      .toString()
      .padStart(2, '0')
    const s = (remaining.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  const progress = computed(() => {
    if (!total.value) return 0
    return remaining.value / total.value
  })

  return {
    remaining,
    total,
    display,
    progress,
  }
}
