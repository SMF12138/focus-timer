<template>
  <div class="flip-clock" :style="{ fontSize: size }">
    <DigitRoller :digit="digits[0]" :size="size" :duration="duration" />
    <DigitRoller :digit="digits[1]" :size="size" :duration="duration" />
    <span class="colon" aria-hidden="true">:</span>
    <DigitRoller :digit="digits[3]" :size="size" :duration="duration" />
    <DigitRoller :digit="digits[4]" :size="size" :duration="duration" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DigitRoller from './DigitRoller.vue'

const props = withDefaults(
  defineProps<{
    time: string
    size?: string
    duration?: number
  }>(),
  {
    size: '10rem',
    duration: 450,
  }
)

const digits = computed(() => {
  const t = props.time || '00:00'
  return t.padStart(5, '0').slice(0, 5)
})
</script>

<style scoped lang="scss">
.flip-clock {
  display: inline-flex;
  align-items: baseline;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: inherit;
  line-height: 1.1;
}

.colon {
  display: inline-flex;
  align-items: center;
  height: 1.1em;
  transform: translateY(-0.05em);
  margin: 0 0.05em;
  opacity: 0.9;
}
</style>
