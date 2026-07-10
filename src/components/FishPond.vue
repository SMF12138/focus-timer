<template>
  <canvas ref="canvas" class="fish-pond"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    mode?: 'free' | 'orbit'
    orbitCenterX?: number
    orbitCenterY?: number
    orbitRadius?: number
  }>(),
  {
    mode: 'free',
    orbitCenterX: 0,
    orbitCenterY: 0,
    orbitRadius: 260,
  }
)

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0

interface FoodParticle {
  ox: number
  oy: number
  eaten: boolean
}

interface Food {
  x: number
  y: number
  radius: number
  particles: FoodParticle[]
  spawnTime: number
}

type FishState = 'orbit' | 'chasing' | 'returning'

interface Fish {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  baseSize: number
  maxSize: number
  tailPhase: number
  wigglePhase: number
  speed: number
  spriteIndex: number
  spriteDirFrames: number
  state: FishState
  orbitAngle: number
  orbitSpeed: number
}

onMounted(() => {
  const canvasEl = canvas.value as HTMLCanvasElement
  const ctx2d = canvasEl.getContext('2d') as CanvasRenderingContext2D
  if (!canvasEl || !ctx2d) return

  let width = 0
  let height = 0
  let mouseX = -1000
  let mouseY = -1000
  let mouseDownTime = 0
  let isMouseDown = false
  let spriteLoaded = false
  const foods: Food[] = []
  const bubbles: Array<{ x: number; y: number; r: number; speed: number; alpha: number }> =
    Array.from({ length: 12 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 2 + Math.random() * 5,
      speed: 0.3 + Math.random() * 0.7,
      alpha: 0.15 + Math.random() * 0.25,
    }))

  const sprite = new Image()
  sprite.src = './goldfish-sprite.png'

  const spriteCols = 2
  const spriteRows = 2
  let spriteW = 0
  let spriteH = 0
  let spriteOnload: (() => void) | null = null

  const orbitMode = props.mode === 'orbit'
  const cx = () => (props.orbitCenterX || width / 2)
  const cy = () => (props.orbitCenterY || height / 2)
  const orbitR = props.orbitRadius

  const fishCount = 24
  const fishes: Fish[] = Array.from({ length: fishCount }).map((_, i) => {
    const baseSize = 12 + Math.random() * 8
    const angle = (i / fishCount) * Math.PI * 2 + Math.random() * 0.5
    const x = orbitMode ? cx() + Math.cos(angle) * orbitR : Math.random() * window.innerWidth
    const y = orbitMode ? cy() + Math.sin(angle) * orbitR : Math.random() * window.innerHeight
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      size: baseSize,
      baseSize,
      maxSize: baseSize + 12,
      tailPhase: Math.random() * Math.PI * 2,
      wigglePhase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.6,
      spriteIndex: 0,
      spriteDirFrames: 0,
      state: orbitMode ? 'orbit' : 'chasing',
      orbitAngle: angle,
      orbitSpeed: (0.003 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
    }
  })

  function resize() {
    width = canvasEl.width = window.innerWidth
    height = canvasEl.height = window.innerHeight
    if (orbitMode) {
      // Re-center orbit positions on resize if still in orbit
      for (const f of fishes) {
        if (f.state === 'orbit') {
          f.x = cx() + Math.cos(f.orbitAngle) * orbitR
          f.y = cy() + Math.sin(f.orbitAngle) * orbitR
        }
      }
    }
  }

  function isInteractive(target: EventTarget | null) {
    if (!target || !(target instanceof HTMLElement)) return false
    const tag = target.tagName
    return ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA', 'LABEL'].includes(tag)
  }

  function spriteIndexForAngle(angle: number) {
    let a = angle
    while (a < 0) a += Math.PI * 2
    while (a >= Math.PI * 2) a -= Math.PI * 2
    if (a >= Math.PI * 1.75 || a < Math.PI * 0.25) return 0
    if (a < Math.PI * 0.75) return 1
    if (a < Math.PI * 1.25) return 2
    return 3
  }

  function createFood(x: number, y: number, radius: number) {
    const count = Math.floor(radius * 1.8)
    const particles: FoodParticle[] = []
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * radius
      particles.push({
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r,
        eaten: false,
      })
    }
    foods.push({ x, y, radius, particles, spawnTime: Date.now() })
  }

  function drawFish(f: Fish) {
    const speed = Math.hypot(f.vx, f.vy)
    const drawSize = f.size * 1.6

    ctx2d.save()
    ctx2d.translate(f.x, f.y)

    const wiggle = Math.sin(f.tailPhase) * 0.08
    ctx2d.rotate(wiggle)

    const scale = 1 + Math.min(speed * 0.02, 0.06)
    ctx2d.scale(scale, scale)

    if (!spriteLoaded || spriteW === 0 || spriteH === 0) {
      ctx2d.beginPath()
      ctx2d.arc(0, 0, drawSize / 2, 0, Math.PI * 2)
      ctx2d.fillStyle = '#fbbf24'
      ctx2d.fill()
    } else {
      ctx2d.shadowBlur = 14
      ctx2d.shadowColor = 'rgba(251, 191, 36, 0.35)'
      const sx = (f.spriteIndex % spriteCols) * spriteW
      const sy = Math.floor(f.spriteIndex / spriteCols) * spriteH
      ctx2d.drawImage(
        sprite,
        sx,
        sy,
        spriteW,
        spriteH,
        -drawSize / 2,
        -drawSize / 2,
        drawSize,
        drawSize
      )
    }
    ctx2d.restore()
  }

  function drawFood() {
    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i]
      const remaining = food.particles.filter((p) => !p.eaten).length
      if (remaining === 0) {
        foods.splice(i, 1)
        continue
      }

      const age = (Date.now() - food.spawnTime) / 1000
      const alpha = Math.max(0, 1 - age * 0.03)

      ctx2d.save()
      ctx2d.globalAlpha = alpha
      ctx2d.shadowBlur = 8
      ctx2d.shadowColor = '#fbbf24'
      ctx2d.fillStyle = '#fbbf24'
      for (const p of food.particles) {
        if (p.eaten) continue
        ctx2d.beginPath()
        ctx2d.arc(food.x + p.ox, food.y + p.oy, 2.5, 0, Math.PI * 2)
        ctx2d.fill()
      }
      ctx2d.restore()
    }
  }

  function drawBubbles() {
    for (const b of bubbles) {
      b.y -= b.speed
      b.x += Math.sin(b.y * 0.02) * 0.3
      if (b.y < -20) {
        b.y = height + 20
        b.x = Math.random() * width
      }
      ctx2d.save()
      ctx2d.globalAlpha = b.alpha
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx2d.lineWidth = 1
      ctx2d.beginPath()
      ctx2d.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx2d.stroke()
      ctx2d.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx2d.fill()
      ctx2d.restore()
    }
  }

  function findClosestFood(f: Fish) {
    let closest: Food | null = null
    let closestDist = Infinity
    for (const food of foods) {
      const remaining = food.particles.filter((p) => !p.eaten)
      if (remaining.length === 0) continue
      const dx = food.x - f.x
      const dy = food.y - f.y
      const dist = Math.hypot(dx, dy)
      if (dist < closestDist) {
        closestDist = dist
        closest = food
      }
    }
    return { closest, closestDist }
  }

  function eatFood(f: Fish, food: Food | null) {
    if (!food) return
    const eatRange = f.size * 0.6
    for (const p of food.particles) {
      if (p.eaten) continue
      const px = food.x + p.ox
      const py = food.y + p.oy
      const dist = Math.hypot(px - f.x, py - f.y)
      if (dist < eatRange) {
        p.eaten = true
        if (f.size < f.maxSize) {
          f.size = Math.min(f.maxSize, f.size + 0.35)
        }
      }
    }
  }

  function moveToTarget(f: Fish, targetX: number, targetY: number, maxSpeed: number) {
    const dx = targetX - f.x
    const dy = targetY - f.y
    const dist = Math.hypot(dx, dy)
    if (dist > 1) {
      f.vx += (dx / dist) * 0.2 * f.speed
      f.vy += (dy / dist) * 0.2 * f.speed
    }
    const speed = Math.hypot(f.vx, f.vy)
    if (speed > maxSpeed) {
      f.vx = (f.vx / speed) * maxSpeed
      f.vy = (f.vy / speed) * maxSpeed
    }
    f.x += f.vx
    f.y += f.vy
  }

  function orbitPosition(f: Fish) {
    const x = cx() + Math.cos(f.orbitAngle) * orbitR
    const y = cy() + Math.sin(f.orbitAngle) * orbitR
    return { x, y }
  }

  function updateFishOrbit(f: Fish) {
    const { closest } = findClosestFood(f)
    const closestDist = closest ? Math.hypot(closest.x - f.x, closest.y - f.y) : Infinity
    const hasFood = closest !== null

    if (hasFood && closestDist < 450) {
      f.state = 'chasing'
    }

    if (f.state === 'orbit') {
      f.orbitAngle += f.orbitSpeed
      const pos = orbitPosition(f)
      // Smoothly move to orbit position (helps after resize)
      f.vx = (pos.x - f.x) * 0.15
      f.vy = (pos.y - f.y) * 0.15
      f.x += f.vx
      f.y += f.vy
    } else if (f.state === 'chasing') {
      if (!closest || closestDist > 500) {
        f.state = 'returning'
      } else {
        const remaining = closest.particles.filter((p) => !p.eaten)
        if (remaining.length === 0) {
          f.state = 'returning'
        } else {
          let tx = 0
          let ty = 0
          for (const p of remaining) {
            tx += closest.x + p.ox
            ty += closest.y + p.oy
          }
          tx /= remaining.length
          ty /= remaining.length
          moveToTarget(f, tx, ty, 2.8)
        }
      }
    } else if (f.state === 'returning') {
      const targetAngle = Math.atan2(f.y - cy(), f.x - cx())
      f.orbitAngle = targetAngle
      const pos = orbitPosition(f)
      moveToTarget(f, pos.x, pos.y, 2.2)
      const dist = Math.hypot(pos.x - f.x, pos.y - f.y)
      if (dist < 15) {
        f.state = 'orbit'
        f.vx = 0
        f.vy = 0
      }
    }

    // Mouse avoidance in all states
    const dxMouse = f.x - mouseX
    const dyMouse = f.y - mouseY
    const distMouse = Math.hypot(dxMouse, dyMouse)
    if (distMouse < 140) {
      const force = (140 - distMouse) / 140
      f.vx += (dxMouse / (distMouse || 1)) * force * 0.8
      f.vy += (dyMouse / (distMouse || 1)) * force * 0.8
    }

    eatFood(f, closest)

    // Sprite direction
    const angle = f.state === 'orbit' ? f.orbitAngle + Math.PI / 2 : Math.atan2(f.vy, f.vx)
    const targetIdx = spriteIndexForAngle(angle)
    if (targetIdx !== f.spriteIndex) {
      f.spriteDirFrames++
      const threshold = 12 + (f.size / f.baseSize) * 8
      if (f.spriteDirFrames >= threshold) {
        f.spriteIndex = targetIdx
        f.spriteDirFrames = 0
      }
    } else {
      f.spriteDirFrames = 0
    }

    const speed = Math.hypot(f.vx, f.vy)
    f.tailPhase += 0.12 + speed * 0.06
  }

  function updateFishFree(f: Fish) {
    const { closest } = findClosestFood(f)
    let hasTarget = false
    let targetX = f.x
    let targetY = f.y

    if (closest) {
      const remaining = closest.particles.filter((p) => !p.eaten)
      let rx = 0
      let ry = 0
      for (const p of remaining) {
        rx += closest.x + p.ox
        ry += closest.y + p.oy
      }
      targetX = rx / remaining.length
      targetY = ry / remaining.length
      hasTarget = true
    }

    const dxMouse = f.x - mouseX
    const dyMouse = f.y - mouseY
    const distMouse = Math.hypot(dxMouse, dyMouse)
    if (distMouse < 160) {
      const force = (160 - distMouse) / 160
      f.vx += (dxMouse / (distMouse || 1)) * force * 0.8
      f.vy += (dyMouse / (distMouse || 1)) * force * 0.8
    }

    if (hasTarget) {
      moveToTarget(f, targetX, targetY, 2.6)
    } else {
      f.wigglePhase += 0.015
      f.vx += Math.sin(f.wigglePhase) * 0.025
      f.vy += Math.cos(f.wigglePhase * 0.7) * 0.025
      const speed = Math.hypot(f.vx, f.vy)
      if (speed > 1.3) {
        f.vx = (f.vx / speed) * 1.3
        f.vy = (f.vy / speed) * 1.3
      }
      f.x += f.vx
      f.y += f.vy
    }

    if (f.x < -80) f.x = width + 80
    if (f.x > width + 80) f.x = -80
    if (f.y < -80) f.y = height + 80
    if (f.y > height + 80) f.y = -80

    eatFood(f, closest)

    const angle = Math.atan2(f.vy, f.vx)
    const targetIdx = spriteIndexForAngle(angle)
    if (targetIdx !== f.spriteIndex) {
      f.spriteDirFrames++
      const threshold = 12 + (f.size / f.baseSize) * 8
      if (f.spriteDirFrames >= threshold) {
        f.spriteIndex = targetIdx
        f.spriteDirFrames = 0
      }
    } else {
      f.spriteDirFrames = 0
    }

    const speed = Math.hypot(f.vx, f.vy)
    f.tailPhase += 0.12 + speed * 0.06
  }

  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX
    mouseY = e.clientY
  }

  function onMouseDown(e: MouseEvent) {
    if (isInteractive(e.target)) return
    isMouseDown = true
    mouseDownTime = Date.now()
  }

  function onMouseUp(e: MouseEvent) {
    if (!isMouseDown) return
    isMouseDown = false
    const duration = Math.min(Date.now() - mouseDownTime, 2000)
    const radius = Math.min(8 + duration * 0.025, 48)
    createFood(e.clientX, e.clientY, radius)
  }

  function onMouseLeave() {
    isMouseDown = false
  }

  function animate() {
    ctx2d.clearRect(0, 0, width, height)
    drawBubbles()
    drawFood()
    for (const f of fishes) {
      if (orbitMode) {
        updateFishOrbit(f)
      } else {
        updateFishFree(f)
      }
      drawFish(f)
    }
    raf = requestAnimationFrame(animate)
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    } else if (spriteLoaded || spriteW === 0) {
      animate()
    }
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mouseleave', onMouseLeave)
  document.addEventListener('visibilitychange', onVisibilityChange)

  spriteOnload = () => {
    spriteLoaded = true
    spriteW = sprite.width / spriteCols
    spriteH = sprite.height / spriteRows
    animate()
  }
  sprite.onload = spriteOnload

  sprite.onerror = () => {
    console.error('[FishPond] Failed to load sprite:', sprite.src)
    spriteLoaded = false
    animate()
  }

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('mouseleave', onMouseLeave)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    sprite.onload = null
    sprite.onerror = null
  })
})
</script>

<style scoped>
.fish-pond {
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}
</style>
