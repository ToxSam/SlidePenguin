import { engine, Entity, Transform, PointerEventType, InputAction, pointerEventsSystem, inputSystem, Animator, GltfContainer, ColliderLayer, AudioSource } from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { GameState, PenguinMovement, SwipeBox, Penguin, HomeTarget, StartButton, LoseTrigger, PenguinPlayerTag, BroomTag } from './components'
import { setGameState, resetGameState } from './gameState'
import { calculateScore, getEntityCenter, calculateDistance2D } from './scoring'
import { INITIAL_SPEED, DECELERATION_RATE, SWIPE_DECELERATION_REDUCTION, SWIPE_DECELERATION_DURATION, COUNTDOWN_DURATION, SWIPE_BOX_OFFSET, SWIPE_COOLDOWN, ROTATION_SPEED_MULTIPLIER, PENGUIN_PLAYER_STOP_Z, PLAYER_INITIAL_POSITION, PLAYER_INITIAL_CAMERA_TARGET, ANIMATION_TRANSITION_DURATION, BROOM_SWIPE_ANIMATION_DURATION, PENGUIN_FRIEND_BOUNCE_DURATION, PENGUIN_FRIEND_BOUNCE_COUNT, PENGUIN_FRIEND_SCALE_BOOST } from './constants'
import { movePlayerTo } from '~system/RestrictedActions'
import { submitScore } from './leaderboard/leaderboardClient'

// Global entity references (set in main)
export let penguinEntity: Entity | null = null
export let broomEntity: Entity | null = null
export let penguinPlayerEntity: Entity | null = null
export let homeEntity: Entity | null = null
export let swipeBoxEntity: Entity | null = null
export let gameStateEntity: Entity | null = null
export let loseZoneEntity: Entity | null = null
let penguinStartPosition: Vector3 | null = null
let broomStartPosition: Vector3 | null = null
let broomStartRotation: Quaternion | null = null
let penguinPlayerStartPosition: Vector3 | null = null
let penguinPlayerStartRotation: Quaternion | null = null

// Countdown timer
let countdownTimer: number = 0
let lastCountdownUpdate: number = 0

// Broom.glb: when to restore BroomIdle01 after BroomSwipe (0 = no pending restore)
let broomSwipeRestoreAt = 0
// Broom.glb: track current idle clip for crossfades (BroomIdle01 or BroomIdle02)
let broomCurrentIdleClip = 'BroomIdle02'
// Broom.glb: have we already switched to BroomIdle02 when reaching z58 this round?
let broomReachedStopZ = false
let activeBroomTransition: AnimationTransition | null = null

// PenguinPlayer.glb: same animation logic as Broom
let penguinPlayerSwipeRestoreAt = 0
let penguinPlayerCurrentIdleClip = 'PenguinBroomIdle02'
let penguinPlayerReachedStopZ = false
let activePenguinPlayerTransition: AnimationTransition | null = null

// Penguin animation crossfade state
let penguinCurrentClip = 'Idle'

// PenguinFriend.glb: Y-scale bounce on interaction (extra animation, not from GLB)
let penguinFriendEntity: Entity | null = null
let penguinFriendBaseScale: Vector3 | null = null
let penguinFriendScaleEndTime = 0
let penguinTalkAudioEntity: Entity | null = null
// Snowslide: play while Penguin.glb is moving during gameplay (loop), stop when stopped
let snowslideAudioEntity: Entity | null = null
// Swipe: one-shot per swipe (no loop)
let swipeAudioEntity: Entity | null = null

interface AnimationTransition {
  entity: Entity
  fromClip: string
  toClip: string
  toLoop: boolean
  elapsed: number
  duration: number
}
let activePenguinTransition: AnimationTransition | null = null

/**
 * Play penguin animation with smooth weight-based crossfade.
 * Uses both clips' weights instead of abrupt playSingleAnimation.
 */
function playPenguinAnimationWithTransition(entity: Entity, toClip: string, loop: boolean) {
  if (!Animator.has(entity)) return
  if (penguinCurrentClip === toClip) return

  const fromClip = penguinCurrentClip
  const animator = Animator.getMutableOrNull(entity)
  if (!animator) return
  const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === fromClip)
  const toClipObj = animator.states.find((s: { clip: string }) => s.clip === toClip)

  if (!toClipObj) {
    Animator.playSingleAnimation(entity, toClip, true)
    const c = Animator.getClipOrNull(entity, toClip)
    if (c) c.loop = loop
    penguinCurrentClip = toClip
    return
  }

  // Full reset to avoid stale state from any previous playSingleAnimation/operations
  for (const state of animator.states) {
    state.playing = false
    state.weight = 0
    state.shouldReset = false
  }
  if (fromClipObj) {
    fromClipObj.playing = true
    fromClipObj.weight = 1
  }
  toClipObj.playing = true
  toClipObj.weight = 0
  toClipObj.loop = loop

  activePenguinTransition = {
    entity,
    fromClip,
    toClip,
    toLoop: loop,
    elapsed: 0,
    duration: ANIMATION_TRANSITION_DURATION
  }
}

/**
 * Play Broom idle animation with smooth crossfade (BroomIdle01 <-> BroomIdle02 only).
 * Full reset of all animator states before blending to avoid stale state from playSingleAnimation.
 */
function playBroomIdleWithTransition(entity: Entity, toClip: 'BroomIdle01' | 'BroomIdle02', loop: boolean) {
  if (!Animator.has(entity)) return
  if (broomCurrentIdleClip === toClip) return

  const fromClip = broomCurrentIdleClip
  const animator = Animator.getMutableOrNull(entity)
  if (!animator) return
  const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === fromClip)
  const toClipObj = animator.states.find((s: { clip: string }) => s.clip === toClip)

  if (!toClipObj) {
    Animator.playSingleAnimation(entity, toClip, true)
    const c = Animator.getClipOrNull(entity, toClip)
    if (c) c.loop = loop
    broomCurrentIdleClip = toClip
    return
  }

  // Full reset: clear ALL states to avoid stale state from playSingleAnimation (BroomSwipe/restore)
  for (const state of animator.states) {
    state.playing = false
    state.weight = 0
    state.shouldReset = false
  }
  if (fromClipObj) {
    fromClipObj.playing = true
    fromClipObj.weight = 1
  }
  toClipObj.playing = true
  toClipObj.weight = 0
  toClipObj.loop = loop

  activeBroomTransition = {
    entity,
    fromClip,
    toClip,
    toLoop: loop,
    elapsed: 0,
    duration: ANIMATION_TRANSITION_DURATION
  }
}

/**
 * Play PenguinPlayer idle animation with smooth crossfade (PenguinBroomIdle01 <-> PenguinBroomIdle02 only).
 */
function playPenguinPlayerIdleWithTransition(entity: Entity, toClip: 'PenguinBroomIdle01' | 'PenguinBroomIdle02', loop: boolean) {
  if (!Animator.has(entity)) return
  if (penguinPlayerCurrentIdleClip === toClip) return

  const fromClip = penguinPlayerCurrentIdleClip
  const animator = Animator.getMutableOrNull(entity)
  if (!animator) return
  const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === fromClip)
  const toClipObj = animator.states.find((s: { clip: string }) => s.clip === toClip)

  if (!toClipObj) {
    Animator.playSingleAnimation(entity, toClip, true)
    const c = Animator.getClipOrNull(entity, toClip)
    if (c) c.loop = loop
    penguinPlayerCurrentIdleClip = toClip
    return
  }

  for (const state of animator.states) {
    state.playing = false
    state.weight = 0
    state.shouldReset = false
  }
  if (fromClipObj) {
    fromClipObj.playing = true
    fromClipObj.weight = 1
  }
  toClipObj.playing = true
  toClipObj.weight = 0
  toClipObj.loop = loop

  activePenguinPlayerTransition = {
    entity,
    fromClip,
    toClip,
    toLoop: loop,
    elapsed: 0,
    duration: ANIMATION_TRANSITION_DURATION
  }
}

/**
 * Update animation crossfade each frame (Penguin + Broom + PenguinPlayer).
 * Uses getMutable to ensure component changes propagate to the renderer.
 */
export function animationTransitionSystem(dt: number) {
  // Penguin transition
  if (activePenguinTransition) {
    const t = activePenguinTransition
    t.elapsed += dt
    const progress = Math.min(1, t.elapsed / t.duration)
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
    const fromWeight = 1 - eased
    const toWeight = eased

    const animator = Animator.getMutableOrNull(t.entity)
    if (animator) {
      const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === t.fromClip)
      const toClipObj = animator.states.find((s: { clip: string }) => s.clip === t.toClip)
      if (fromClipObj) fromClipObj.weight = fromWeight
      if (toClipObj) toClipObj.weight = toWeight

      if (progress >= 1) {
        // Complete transition: clean up all states for next transition
        for (const state of animator.states) {
          state.playing = state.clip === t.toClip
          state.weight = state.clip === t.toClip ? 1 : 0
        }
        penguinCurrentClip = t.toClip
        activePenguinTransition = null
      }
    } else {
      activePenguinTransition = null
    }
  }

  // Broom transition
  if (activeBroomTransition) {
    const t = activeBroomTransition
    t.elapsed += dt
    const progress = Math.min(1, t.elapsed / t.duration)
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
    const fromWeight = 1 - eased
    const toWeight = eased

    const animator = Animator.getMutableOrNull(t.entity)
    if (animator) {
      const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === t.fromClip)
      const toClipObj = animator.states.find((s: { clip: string }) => s.clip === t.toClip)
      if (fromClipObj) fromClipObj.weight = fromWeight
      if (toClipObj) toClipObj.weight = toWeight

      if (progress >= 1) {
        // Complete transition: clean up all states for next transition
        for (const state of animator.states) {
          state.playing = state.clip === t.toClip
          state.weight = state.clip === t.toClip ? 1 : 0
        }
        broomCurrentIdleClip = t.toClip as 'BroomIdle01' | 'BroomIdle02'
        activeBroomTransition = null
      }
    } else {
      activeBroomTransition = null
    }
  }

  // PenguinPlayer transition
  if (activePenguinPlayerTransition) {
    const t = activePenguinPlayerTransition
    t.elapsed += dt
    const progress = Math.min(1, t.elapsed / t.duration)
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
    const fromWeight = 1 - eased
    const toWeight = eased

    const animator = Animator.getMutableOrNull(t.entity)
    if (animator) {
      const fromClipObj = animator.states.find((s: { clip: string }) => s.clip === t.fromClip)
      const toClipObj = animator.states.find((s: { clip: string }) => s.clip === t.toClip)
      if (fromClipObj) fromClipObj.weight = fromWeight
      if (toClipObj) toClipObj.weight = toWeight

      if (progress >= 1) {
        for (const state of animator.states) {
          state.playing = state.clip === t.toClip
          state.weight = state.clip === t.toClip ? 1 : 0
        }
        penguinPlayerCurrentIdleClip = t.toClip as 'PenguinBroomIdle01' | 'PenguinBroomIdle02'
        activePenguinPlayerTransition = null
      }
    } else {
      activePenguinPlayerTransition = null
    }
  }
}

/**
 * PenguinFriend.glb: apply Y-scale bounce when interacted (extra, not from GLB).
 * Scales up and down on Y each frame during the bounce duration.
 */
export function penguinFriendShakeSystem(dt: number) {
  if (!penguinFriendEntity || !penguinFriendBaseScale || !Transform.has(penguinFriendEntity)) return
  const now = Date.now() / 1000
  if (now >= penguinFriendScaleEndTime) {
    const t = Transform.getMutable(penguinFriendEntity)
    t.scale = { ...penguinFriendBaseScale }
    penguinFriendScaleEndTime = 0
    return
  }
  const elapsed = PENGUIN_FRIEND_BOUNCE_DURATION - (penguinFriendScaleEndTime - now)
  const progress = Math.min(1, elapsed / PENGUIN_FRIEND_BOUNCE_DURATION)
  // Sine wave: BOUNCE_COUNT full up-down cycles over the duration
  const scaleY = 1 + Math.sin(progress * 2 * Math.PI * PENGUIN_FRIEND_BOUNCE_COUNT) * PENGUIN_FRIEND_SCALE_BOOST
  const t = Transform.getMutable(penguinFriendEntity)
  t.scale = Vector3.create(
    penguinFriendBaseScale.x,
    penguinFriendBaseScale.y * scaleY,
    penguinFriendBaseScale.z
  )
}

/**
 * Initialize game entities and references
 */
export function initializeGameEntities() {
  // Get entities by name
  penguinEntity = engine.getEntityOrNullByName('Penguin.glb')
  broomEntity = engine.getEntityOrNullByName('Broom.glb')
  penguinPlayerEntity = engine.getEntityOrNullByName('PenguinPlayer.glb')
  homeEntity = engine.getEntityOrNullByName('Home01.glb')
  const startButtonEntity = engine.getEntityOrNullByName('Buttons')
  loseZoneEntity = engine.getEntityOrNullByName('TriggerLose')

  if (!penguinEntity || !homeEntity || !startButtonEntity || !loseZoneEntity) {
    console.error('Failed to find required entities')
    return
  }

  // Store penguin start position
  if (Transform.has(penguinEntity)) {
    penguinStartPosition = Transform.get(penguinEntity).position
  }

  // Broom.glb: tag and store scene position (same movement as PenguinPlayer)
  if (broomEntity && Transform.has(broomEntity)) {
    BroomTag.create(broomEntity)
    const t = Transform.get(broomEntity)
    broomStartPosition = { ...t.position }
    broomStartRotation = { ...t.rotation }
  }

  // PenguinPlayer.glb: tag and store scene position (same movement as Broom)
  if (penguinPlayerEntity && Transform.has(penguinPlayerEntity)) {
    PenguinPlayerTag.create(penguinPlayerEntity)
    const t = Transform.get(penguinPlayerEntity)
    penguinPlayerStartPosition = { ...t.position }
    penguinPlayerStartRotation = { ...t.rotation }
  }

  // Create game state entity
  gameStateEntity = engine.addEntity()
  GameState.create(gameStateEntity, {
    state: 'idle',
    countdownValue: 0,
    score: 0,
    hasLost: false,
    distanceToHome: 0,
    canSwipe: true,
    showPenguinFriendDialog: false,
    countdownShakeX: 0,
    countdownShakeY: 0
  })

  // Tag entities
  Penguin.create(penguinEntity)
  HomeTarget.create(homeEntity)
  StartButton.create(startButtonEntity)
  LoseTrigger.create(loseZoneEntity)

  // Set up start button click handler
  pointerEventsSystem.onPointerDown(
    {
      entity: startButtonEntity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Start Game',
        maxDistance: 10
      }
    },
    () => {
      startGame()
    }
  )

  // PenguinFriend.glb: click to open "play game?" dialog
  penguinFriendEntity = engine.getEntityOrNullByName('PenguinFriend.glb')
  if (penguinFriendEntity) {
    // Store base scale for Y-scale bounce animation
    if (Transform.has(penguinFriendEntity)) {
      penguinFriendBaseScale = { ...Transform.get(penguinFriendEntity).scale }
    }
    // PenguinTalk.mp3: reusable entity; createOrReplace + global for reliable playback
    penguinTalkAudioEntity = engine.addEntity()
    Transform.create(penguinTalkAudioEntity, { position: Transform.get(penguinFriendEntity).position, scale: Vector3.One(), rotation: Quaternion.Identity() })
    AudioSource.create(penguinTalkAudioEntity, { audioClipUrl: 'assets/scene/Audio/PenguinTalk.mp3', playing: false, loop: false, volume: 1, global: true })
    // Enable pointer hits: scene has visibleMeshesCollisionMask 0, so clicks don't register.
    if (GltfContainer.has(penguinFriendEntity)) {
      const gltf = GltfContainer.getMutable(penguinFriendEntity)
      gltf.visibleMeshesCollisionMask = ColliderLayer.CL_POINTER
    }
    pointerEventsSystem.onPointerDown(
      {
        entity: penguinFriendEntity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: 'Talk',
          maxDistance: 10
        }
      },
      () => {
        if (!gameStateEntity) return
        const gameState = GameState.get(gameStateEntity)
        if (gameState.state !== 'idle') return
        // Play PenguinTalk.mp3 (global so it plays reliably regardless of player position)
        if (penguinTalkAudioEntity) {
          AudioSource.createOrReplace(penguinTalkAudioEntity, { audioClipUrl: 'assets/scene/Audio/PenguinTalk.mp3', playing: true, loop: false, volume: 1, global: true })
        }
        // Trigger Y-scale bounce animation
        penguinFriendScaleEndTime = Date.now() / 1000 + PENGUIN_FRIEND_BOUNCE_DURATION
        const mutable = GameState.getMutable(gameStateEntity)
        mutable.showPenguinFriendDialog = true
      }
    )
  }

  // Lose zone: we check penguin position vs TriggerLose's box each frame (see penguinMovementSystem).
  // TriggerArea only detects the player avatar, not scene entities like the penguin.

  // Create swipe box entity for cooldown tracking (no visual - E key only)
  swipeBoxEntity = engine.addEntity()
  SwipeBox.create(swipeBoxEntity, {
    offset: SWIPE_BOX_OFFSET,
    boostAmount: SWIPE_DECELERATION_REDUCTION,
    isVisible: false,
    lastSwipeTime: 0
  })

  // Snowslide.mp3: play while Penguin.glb is moving, stop when stopped (same pattern as PenguinTalk – reusable entity, global)
  snowslideAudioEntity = engine.addEntity()
  Transform.create(snowslideAudioEntity, { position: Transform.get(penguinEntity).position, scale: Vector3.One(), rotation: Quaternion.Identity() })
  AudioSource.create(snowslideAudioEntity, { audioClipUrl: 'assets/scene/Audio/snowslide.mp3', playing: false, loop: true, volume: 1, global: true })

  // Swipe.mp3: one-shot per swipe (reusable entity, global)
  swipeAudioEntity = engine.addEntity()
  Transform.create(swipeAudioEntity, { position: Transform.get(penguinEntity).position, scale: Vector3.One(), rotation: Quaternion.Identity() })
  AudioSource.create(swipeAudioEntity, { audioClipUrl: 'assets/scene/Audio/swipe.mp3', playing: false, loop: false, volume: 1, global: true })
}

/**
 * Close the penguin friend dialog (No button)
 */
export function closePenguinFriendDialog() {
  if (!gameStateEntity) return
  const mutable = GameState.getMutable(gameStateEntity)
  mutable.showPenguinFriendDialog = false
}

/**
 * Start the game from the penguin friend dialog (Yes button)
 */
export function startGameFromDialog() {
  if (!gameStateEntity) return
  const mutable = GameState.getMutable(gameStateEntity)
  mutable.showPenguinFriendDialog = false
  startGame()
}

/**
 * Start the game countdown
 */
function startGame() {
  if (!gameStateEntity || !penguinEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'idle') return // Only start if idle

  // Reset penguin to start position and rotation
  if (penguinStartPosition && Transform.has(penguinEntity)) {
    const mutableTransform = Transform.getMutable(penguinEntity)
    mutableTransform.position = penguinStartPosition
    mutableTransform.rotation = Quaternion.Identity() // Reset rotation to default
  }

  // Reset Broom and PenguinPlayer to their scene positions (they move horizontally with same delta as Penguin)
  if (broomEntity && Transform.has(broomEntity) && broomStartPosition && broomStartRotation) {
    const broomT = Transform.getMutable(broomEntity)
    broomT.position = { ...broomStartPosition }
    broomT.rotation = { ...broomStartRotation }
  }
  if (penguinPlayerEntity && Transform.has(penguinPlayerEntity) && penguinPlayerStartPosition && penguinPlayerStartRotation) {
    const playerT = Transform.getMutable(penguinPlayerEntity)
    playerT.position = { ...penguinPlayerStartPosition }
    playerT.rotation = { ...penguinPlayerStartRotation }
  }

  // Penguin: play Jump01 during countdown (3-2-1) with smooth transition
  if (penguinEntity && Animator.has(penguinEntity)) {
    playPenguinAnimationWithTransition(penguinEntity, 'Jump01', true)
  }

  // Initialize countdown
  setGameState(gameStateEntity, 'countdown', COUNTDOWN_DURATION, 0, false)
  countdownTimer = COUNTDOWN_DURATION
  lastCountdownUpdate = Date.now()
}

/**
 * Handle swipe box click
 */
function handleSwipe() {
  if (!swipeBoxEntity || !penguinEntity || !gameStateEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'playing') return // Only swipe during play

  // No more swipes once PenguinPlayer reaches the stop line (z58)
  if (penguinPlayerEntity && Transform.has(penguinPlayerEntity)) {
    const playerPos = Transform.get(penguinPlayerEntity).position
    if (playerPos.z >= PENGUIN_PLAYER_STOP_Z) return
  }

  const swipeBox = SwipeBox.get(swipeBoxEntity)
  const currentTime = Date.now() / 1000 // Convert to seconds

  // Broom.glb: play BroomSwipe every E press (restart each time, no crossfade)
  // Use manual state manipulation instead of playSingleAnimation for Godot mobile compatibility
  if (broomEntity && Animator.has(broomEntity)) {
    activeBroomTransition = null
    const animator = Animator.getMutableOrNull(broomEntity)
    if (animator) {
      for (const state of animator.states) {
        state.playing = false
        state.weight = 0
        state.shouldReset = false
      }
      const broomSwipe = animator.states.find((s: { clip: string }) => s.clip === 'BroomSwipe')
      if (broomSwipe) {
        broomSwipe.shouldReset = true  // Force restart from frame 0
        broomSwipe.playing = true
        broomSwipe.weight = 1
        broomSwipe.loop = false
      }
    }
    broomSwipeRestoreAt = currentTime + BROOM_SWIPE_ANIMATION_DURATION
  }

  // PenguinPlayer.glb: play PenguinSwipe01 every E press (restart each time, no crossfade)
  // Use manual state manipulation instead of playSingleAnimation for Godot mobile compatibility
  if (penguinPlayerEntity && Animator.has(penguinPlayerEntity)) {
    activePenguinPlayerTransition = null
    const animator = Animator.getMutableOrNull(penguinPlayerEntity)
    if (animator) {
      for (const state of animator.states) {
        state.playing = false
        state.weight = 0
        state.shouldReset = false
      }
      const penguinSwipe = animator.states.find((s: { clip: string }) => s.clip === 'PenguinSwipe01')
      if (penguinSwipe) {
        penguinSwipe.shouldReset = true  // Force restart from frame 0
        penguinSwipe.playing = true
        penguinSwipe.weight = 1
        penguinSwipe.loop = false
      }
    }
    penguinPlayerSwipeRestoreAt = currentTime + BROOM_SWIPE_ANIMATION_DURATION
  }

  // Deceleration reduction only when not on cooldown (game mechanic)
  if (currentTime - swipeBox.lastSwipeTime >= SWIPE_COOLDOWN) {
    if (PenguinMovement.has(penguinEntity)) {
      const movement = PenguinMovement.getMutable(penguinEntity)
      if (movement.decelerationReductionEndTime > currentTime) {
        movement.decelerationReductionEndTime = currentTime + SWIPE_DECELERATION_DURATION
      } else {
        movement.decelerationReductionEndTime = currentTime + SWIPE_DECELERATION_DURATION
      }
      movement.currentDecelerationRate = Math.max(0, movement.baseDecelerationRate - swipeBox.boostAmount)
      movement.lastSpeedUpdateTime = currentTime
      movement.speedAtLastUpdate = movement.currentSpeed
    }
    const mutableSwipeBox = SwipeBox.getMutable(swipeBoxEntity)
    mutableSwipeBox.lastSwipeTime = currentTime
    // Swipe.mp3: one-shot per swipe (same pattern as PenguinTalk – createOrReplace with playing: true)
    if (swipeAudioEntity) {
      AudioSource.createOrReplace(swipeAudioEntity, { audioClipUrl: 'assets/scene/Audio/swipe.mp3', playing: true, loop: false, volume: 1, global: true })
    }
  }
}

/**
 * End the game and calculate score
 */
function endGame(hasLost: boolean) {
  if (!gameStateEntity || !penguinEntity || !homeEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'playing') return

  let finalScore = 0
  let finalDistance = 0

  // Calculate final distance
  const penguinPos = Transform.get(penguinEntity).position
  const homePos = getEntityCenter(homeEntity)
  
  if (homePos) {
    finalDistance = calculateDistance2D(penguinPos, homePos)
    
    if (!hasLost) {
      // Calculate score based on distance (less meters = more points)
      finalScore = calculateScore(penguinPos, homePos)
    }
  }

  setGameState(gameStateEntity, 'ended', 0, finalScore, hasLost, finalDistance)

  if (!hasLost && finalScore > 0) {
    submitScore(finalScore)
  }
  // Stop snowslide when game ends
  if (snowslideAudioEntity) {
    AudioSource.createOrReplace(snowslideAudioEntity, {
      audioClipUrl: 'assets/scene/Audio/snowslide.mp3',
      playing: false,
      loop: true,
      volume: 1,
      global: true
    })
  }

  // Remove movement component
  if (penguinEntity && PenguinMovement.has(penguinEntity)) {
    PenguinMovement.deleteFrom(penguinEntity)
  }

  // Penguin: play Jump01 in loop until Play Again is clicked, with smooth transition
  if (penguinEntity && Animator.has(penguinEntity)) {
    playPenguinAnimationWithTransition(penguinEntity, 'Jump01', true)
  }

  // Broom.glb: restore BroomIdle02 when game ends (with crossfade)
  if (broomEntity && Animator.has(broomEntity)) {
    playBroomIdleWithTransition(broomEntity, 'BroomIdle02', true)
  }
  broomSwipeRestoreAt = 0

  // PenguinPlayer.glb: restore PenguinBroomIdle02 when game ends (with crossfade)
  if (penguinPlayerEntity && Animator.has(penguinPlayerEntity)) {
    playPenguinPlayerIdleWithTransition(penguinPlayerEntity, 'PenguinBroomIdle02', true)
  }
  penguinPlayerSwipeRestoreAt = 0
}

/**
 * Restart the game - reset to idle state
 */
export function restartGame() {
  if (!gameStateEntity || !penguinEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'ended') return // Only restart from ended state

  // Reset game state to idle
  resetGameState(gameStateEntity)

  // Reset penguin to start position and rotation
  if (penguinStartPosition && Transform.has(penguinEntity)) {
    const mutableTransform = Transform.getMutable(penguinEntity)
    mutableTransform.position = penguinStartPosition
    mutableTransform.rotation = Quaternion.Identity() // Reset rotation to default
  }

  // Reset Broom and PenguinPlayer to their scene positions
  if (broomEntity && Transform.has(broomEntity) && broomStartPosition && broomStartRotation) {
    const broomT = Transform.getMutable(broomEntity)
    broomT.position = { ...broomStartPosition }
    broomT.rotation = { ...broomStartRotation }
  }
  if (penguinPlayerEntity && Transform.has(penguinPlayerEntity) && penguinPlayerStartPosition && penguinPlayerStartRotation) {
    const playerT = Transform.getMutable(penguinPlayerEntity)
    playerT.position = { ...penguinPlayerStartPosition }
    playerT.rotation = { ...penguinPlayerStartRotation }
  }

  // Reset swipe box state
  if (swipeBoxEntity && SwipeBox.has(swipeBoxEntity)) {
    SwipeBox.getMutable(swipeBoxEntity).isVisible = false
  }

  // Stop snowslide when restarting
  if (snowslideAudioEntity) {
    AudioSource.createOrReplace(snowslideAudioEntity, { audioClipUrl: 'assets/scene/Audio/snowslide.mp3', playing: false, loop: true, volume: 1, global: true })
  }

  // Remove any movement component
  if (PenguinMovement.has(penguinEntity)) {
    PenguinMovement.deleteFrom(penguinEntity)
  }

  // Penguin: restore Idle animation (Creator Hub setup) with smooth transition
  if (penguinEntity && Animator.has(penguinEntity)) {
    playPenguinAnimationWithTransition(penguinEntity, 'Idle', true)
  }

  // Broom.glb: restore BroomIdle02 (Creator Hub default) with crossfade
  if (broomEntity && Animator.has(broomEntity)) {
    playBroomIdleWithTransition(broomEntity, 'BroomIdle02', true)
  }
  broomSwipeRestoreAt = 0
  broomReachedStopZ = false

  // PenguinPlayer.glb: restore PenguinBroomIdle02 (Creator Hub default) with crossfade
  if (penguinPlayerEntity && Animator.has(penguinPlayerEntity)) {
    playPenguinPlayerIdleWithTransition(penguinPlayerEntity, 'PenguinBroomIdle02', true)
  }
  penguinPlayerSwipeRestoreAt = 0
  penguinPlayerReachedStopZ = false

  // Teleport the player to the initial position (near the start)
  void movePlayerTo({
    newRelativePosition: PLAYER_INITIAL_POSITION,
    cameraTarget: PLAYER_INITIAL_CAMERA_TARGET
  })
}

/**
 * Game state management system
 * Handles countdown and state transitions
 */
export function gameStateSystem(dt: number) {
  if (!gameStateEntity) return

  const gameState = GameState.get(gameStateEntity)

  if (gameState.state === 'countdown') {
    // Shake animation for countdown display (every frame)
    const t = Date.now() * 0.02
    const mutableState = GameState.getMutable(gameStateEntity)
    mutableState.countdownShakeX = Math.sin(t) * 8 + Math.sin(t * 2.3) * 4
    mutableState.countdownShakeY = Math.cos(t * 1.1) * 6 + Math.cos(t * 1.7) * 3

    const currentTime = Date.now()
    const elapsed = (currentTime - lastCountdownUpdate) / 1000 // Convert to seconds

    if (elapsed >= 1.0) {
      countdownTimer -= 1
      lastCountdownUpdate = currentTime

      mutableState.countdownValue = countdownTimer

      if (countdownTimer <= 0) {
        // Start playing
        mutableState.state = 'playing'
        mutableState.countdownValue = 0
        mutableState.countdownShakeX = 0
        mutableState.countdownShakeY = 0

        // Penguin: play SlideIdle when game starts (after countdown) with smooth transition
        if (penguinEntity && Animator.has(penguinEntity)) {
          playPenguinAnimationWithTransition(penguinEntity, 'SlideIdle', true)
        }

        // Broom.glb: play BroomIdle01 on loop during game (with crossfade from BroomIdle02)
        if (broomEntity && Animator.has(broomEntity)) {
          playBroomIdleWithTransition(broomEntity, 'BroomIdle01', true)
        }
        broomSwipeRestoreAt = 0
        broomReachedStopZ = false

        // PenguinPlayer.glb: play PenguinBroomIdle01 on loop during game (with crossfade from PenguinBroomIdle02)
        if (penguinPlayerEntity && Animator.has(penguinPlayerEntity)) {
          playPenguinPlayerIdleWithTransition(penguinPlayerEntity, 'PenguinBroomIdle01', true)
        }
        penguinPlayerSwipeRestoreAt = 0
        penguinPlayerReachedStopZ = false

        // Initialize distance to home
        if (penguinEntity && homeEntity) {
          const penguinPos = Transform.get(penguinEntity).position
          const homePos = getEntityCenter(homeEntity)
          if (homePos) {
            mutableState.distanceToHome = calculateDistance2D(penguinPos, homePos)
          }
          
          // Initialize penguin movement
          initializePenguinMovement()
        }
      }
    }
  }
}

/**
 * Initialize penguin movement toward Home01
 */
function initializePenguinMovement() {
  if (!penguinEntity || !homeEntity) return

  const penguinPos = Transform.get(penguinEntity).position
  const homePos = getEntityCenter(homeEntity)

  if (!homePos) return

  // Calculate direction vector (normalized)
  const direction = Vector3.subtract(homePos, penguinPos)
  direction.y = 0 // Keep movement on horizontal plane
  const distance = Vector3.length(direction)
  
  if (distance < 0.01) return // Too close, no movement needed

  const normalizedDirection = Vector3.normalize(direction)
  const initialVelocity = Vector3.scale(normalizedDirection, INITIAL_SPEED)

  // Create movement component
  const startTime = Date.now() / 1000
  PenguinMovement.create(penguinEntity, {
    velocity: initialVelocity,
    currentSpeed: INITIAL_SPEED,
    initialSpeed: INITIAL_SPEED,
    baseDecelerationRate: DECELERATION_RATE,
    currentDecelerationRate: DECELERATION_RATE,
    direction: normalizedDirection,
    startTime: startTime, // Current time in seconds
    decelerationReductionEndTime: 0, // No reduction active initially
    lastSpeedUpdateTime: startTime, // Track when speed was last updated
    speedAtLastUpdate: INITIAL_SPEED // Track speed at last update
  })

  // Mark swipe box as active
  if (swipeBoxEntity && SwipeBox.has(swipeBoxEntity)) {
    SwipeBox.getMutable(swipeBoxEntity).isVisible = true
  }
}

/**
 * Check if a point is inside an axis-aligned box defined by an entity's Transform
 * (position = center, scale = full size, same as TriggerArea's 1m cube × scale).
 */
function isPointInBox(point: Vector3, center: Vector3, scale: Vector3): boolean {
  const hx = scale.x / 2
  const hy = scale.y / 2
  const hz = scale.z / 2
  return (
    point.x >= center.x - hx && point.x <= center.x + hx &&
    point.y >= center.y - hy && point.y <= center.y + hy &&
    point.z >= center.z - hz && point.z <= center.z + hz
  )
}

/**
 * Penguin movement system
 * Updates position based on velocity and applies deceleration
 */
export function penguinMovementSystem(dt: number) {
  if (!penguinEntity || !gameStateEntity || !homeEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'playing') return

  if (!PenguinMovement.has(penguinEntity) || !Transform.has(penguinEntity)) return

  const movement = PenguinMovement.getMutable(penguinEntity)
  const transform = Transform.getMutable(penguinEntity)

  // Calculate elapsed time since movement started
  const currentTime = Date.now() / 1000
  const timeSinceLastUpdate = currentTime - movement.lastSpeedUpdateTime

  // Check if deceleration reduction is still active
  if (movement.decelerationReductionEndTime > currentTime) {
    // Deceleration is reduced - use reduced deceleration rate
    movement.currentDecelerationRate = Math.max(0, movement.baseDecelerationRate - SWIPE_DECELERATION_REDUCTION)
  } else {
    // Deceleration reduction expired - restore base deceleration
    movement.currentDecelerationRate = movement.baseDecelerationRate
  }

  // Apply deceleration based on current speed and time since last update
  // This prevents speed jumps - we decelerate from the current speed, not recalculate from start
  movement.currentSpeed = Math.max(0, movement.speedAtLastUpdate - (movement.currentDecelerationRate * timeSinceLastUpdate))
  
  // Update tracking for next frame
  movement.lastSpeedUpdateTime = currentTime
  movement.speedAtLastUpdate = movement.currentSpeed

  // Update velocity vector
  movement.velocity = Vector3.scale(movement.direction, movement.currentSpeed)

  // Snowslide.mp3: play while Penguin is moving, stop when stopped (same pattern as PenguinTalk – global, loop)
  if (snowslideAudioEntity) {
    const playing = movement.currentSpeed > 0.01
    AudioSource.createOrReplace(snowslideAudioEntity, { audioClipUrl: 'assets/scene/Audio/snowslide.mp3', playing, loop: true, volume: 1, global: true })
  }

  // Update position
  const deltaPosition = Vector3.scale(movement.velocity, dt)
  transform.position = Vector3.add(transform.position, deltaPosition)

  // Apply spinning animation - rotation speed is proportional to current speed
  const rotationSpeedDegreesPerSecond = movement.currentSpeed * ROTATION_SPEED_MULTIPLIER
  const rotationSpeedRadiansPerSecond = (rotationSpeedDegreesPerSecond * Math.PI) / 180
  const rotationDelta = Quaternion.fromAngleAxis(rotationSpeedRadiansPerSecond * dt, Vector3.Up())
  transform.rotation = Quaternion.multiply(transform.rotation, rotationDelta)

  // Broom.glb: restore BroomIdle01 after BroomSwipe finishes (no crossfade)
  if (broomSwipeRestoreAt > 0 && currentTime >= broomSwipeRestoreAt) {
    broomSwipeRestoreAt = 0
    if (broomEntity && Animator.has(broomEntity)) {
      const animator = Animator.getMutableOrNull(broomEntity)
      if (animator) {
        for (const state of animator.states) {
          state.playing = false
          state.weight = 0
        }
        const idle01 = animator.states.find((s: { clip: string }) => s.clip === 'BroomIdle01')
        if (idle01) {
          idle01.playing = true
          idle01.weight = 1
          idle01.loop = true
        }
        broomCurrentIdleClip = 'BroomIdle01'
      }
    }
  }

  // PenguinPlayer.glb: restore PenguinBroomIdle01 after PenguinSwipe01 finishes (no crossfade)
  if (penguinPlayerSwipeRestoreAt > 0 && currentTime >= penguinPlayerSwipeRestoreAt) {
    penguinPlayerSwipeRestoreAt = 0
    if (penguinPlayerEntity && Animator.has(penguinPlayerEntity)) {
      const animator = Animator.getMutableOrNull(penguinPlayerEntity)
      if (animator) {
        for (const state of animator.states) {
          state.playing = false
          state.weight = 0
        }
        const idle01 = animator.states.find((s: { clip: string }) => s.clip === 'PenguinBroomIdle01')
        if (idle01) {
          idle01.playing = true
          idle01.weight = 1
          idle01.loop = true
        }
        penguinPlayerCurrentIdleClip = 'PenguinBroomIdle01'
      }
    }
  }

  // Broom and PenguinPlayer: same horizontal delta as Penguin, no spin - but stop at z58
  if (broomEntity && Transform.has(broomEntity)) {
    const broomTransform = Transform.getMutable(broomEntity)
    const newBroomPos = Vector3.add(broomTransform.position, deltaPosition)
    const clampedZ = Math.min(newBroomPos.z, PENGUIN_PLAYER_STOP_Z)
    broomTransform.position = Vector3.create(newBroomPos.x, newBroomPos.y, clampedZ)

    // Broom.glb: switch to BroomIdle02 when reaching z58 (with crossfade)
    if (!broomReachedStopZ && clampedZ >= PENGUIN_PLAYER_STOP_Z - 0.01) {
      broomReachedStopZ = true
      if (Animator.has(broomEntity)) {
        playBroomIdleWithTransition(broomEntity, 'BroomIdle02', true)
      }
    }
  }
  if (penguinPlayerEntity && Transform.has(penguinPlayerEntity)) {
    const playerTransform = Transform.getMutable(penguinPlayerEntity)
    const newPlayerPos = Vector3.add(playerTransform.position, deltaPosition)
    const clampedPlayerZ = Math.min(newPlayerPos.z, PENGUIN_PLAYER_STOP_Z)
    playerTransform.position = Vector3.create(newPlayerPos.x, newPlayerPos.y, clampedPlayerZ)

    // PenguinPlayer.glb: switch to PenguinBroomIdle02 when reaching z58 (with crossfade)
    if (!penguinPlayerReachedStopZ && clampedPlayerZ >= PENGUIN_PLAYER_STOP_Z - 0.01) {
      penguinPlayerReachedStopZ = true
      if (Animator.has(penguinPlayerEntity)) {
        playPenguinPlayerIdleWithTransition(penguinPlayerEntity, 'PenguinBroomIdle02', true)
      }
    }
  }

  // Update distance to home and canSwipe (no swipes once PenguinPlayer reaches z58)
  const penguinPos = transform.position
  const homePos = getEntityCenter(homeEntity)
  if (gameStateEntity) {
    const mutableState = GameState.getMutable(gameStateEntity)
    if (homePos) {
      mutableState.distanceToHome = calculateDistance2D(penguinPos, homePos)
    }
    const playerZ = penguinPlayerEntity && Transform.has(penguinPlayerEntity)
      ? Transform.get(penguinPlayerEntity).position.z
      : 0
    mutableState.canSwipe = playerZ < PENGUIN_PLAYER_STOP_Z
  }

  // Check if penguin entered lose zone (position-based; TriggerArea only detects player)
  if (loseZoneEntity && Transform.has(loseZoneEntity)) {
    const zone = Transform.get(loseZoneEntity)
    if (isPointInBox(penguinPos, zone.position, zone.scale)) {
      endGame(true) // Game lost
      return
    }
  }

  // Check if penguin has stopped
  if (movement.currentSpeed <= 0.01) {
    endGame(false) // Game ended normally
  }
}

/**
 * Input system for E key swiping
 * Allows players to swipe using the E key (IA_PRIMARY)
 */
export function swipeInputSystem(dt: number) {
  if (!gameStateEntity) return

  const gameState = GameState.get(gameStateEntity)
  if (gameState.state !== 'playing') return // Only allow swiping during play

  // Check if E key (IA_PRIMARY) is pressed
  if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) {
    handleSwipe()
  }
}
