<template>
  <div class="aurora-bg">
    <div class="aurora aurora-1"></div>
    <div class="aurora aurora-2"></div>
    <div class="aurora aurora-3"></div>
    <div v-if="count >= 4" class="aurora aurora-4"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: 3 | 4
  }>(),
  {
    count: 3,
  }
)
</script>

<style scoped lang="scss">
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
  width: 60vw;
  height: 60vw;
  top: 10%;
  left: 20%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 60%);
  animation-delay: 0s;
}

.aurora-2 {
  width: 50vw;
  height: 50vw;
  top: 40%;
  right: 10%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent 60%);
  animation-delay: -7s;
}

.aurora-3 {
  width: 45vw;
  height: 45vw;
  bottom: 5%;
  left: 30%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.25), transparent 60%);
  animation-delay: -14s;
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
    transform: translate(5%, -5%) scale(1.05);
  }
  50% {
    transform: translate(-3%, 3%) scale(0.95);
  }
  75% {
    transform: translate(4%, 2%) scale(1.02);
  }
}
</style>
