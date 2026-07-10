<template>
  <div class="digit-roller" :style="{ fontSize: size }">
    <div class="roller" :style="rollerStyle">
      <div v-for="n in 10" :key="n" class="digit-char">{{ n - 1 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    digit: string | number
    size?: string
    duration?: number
  }>(),
  {
    size: '1em',
    duration: 400,
  }
)

const value = computed(() => {
  const n = Number(props.digit)
  return Number.isNaN(n) ? 0 : n % 10
})

const rollerStyle = computed(() => ({
  transform: `translateY(-${value.value * 100}%)`,
  transition: `transform ${props.duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
}))
</script>

<style scoped lang="scss">
.digit-roller {
  display: inline-block;
  position: relative;
  height: 1.1em;
  line-height: 1.1;
  overflow: hidden;
  vertical-align: bottom;
  font-variant-numeric: tabular-nums;
}

.roller {
  display: flex;
  flex-direction: column;
}

.digit-char {
  height: 1.1em;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
