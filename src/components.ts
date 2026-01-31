import { engine, Schemas } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

// Game state component
export const GameState = engine.defineComponent('gameState', {
  state: Schemas.String, // 'idle' | 'countdown' | 'playing' | 'ended'
  countdownValue: Schemas.Number,
  score: Schemas.Number,
  hasLost: Schemas.Boolean,
  distanceToHome: Schemas.Number, // Distance in meters to Home01
  canSwipe: Schemas.Boolean // false once PenguinPlayer reaches z58
})

// Penguin movement component
export const PenguinMovement = engine.defineComponent('penguinMovement', {
  velocity: Schemas.Vector3,
  currentSpeed: Schemas.Number,
  initialSpeed: Schemas.Number,
  baseDecelerationRate: Schemas.Number, // Base deceleration rate
  currentDecelerationRate: Schemas.Number, // Current deceleration (can be reduced by swipes)
  direction: Schemas.Vector3,
  startTime: Schemas.Number, // Timestamp when movement started
  decelerationReductionEndTime: Schemas.Number, // When deceleration reduction ends (0 if not active)
  lastSpeedUpdateTime: Schemas.Number, // Last time speed was updated (to prevent jumps)
  speedAtLastUpdate: Schemas.Number // Speed at last update (to prevent jumps)
})

// Swipe box component
export const SwipeBox = engine.defineComponent('swipeBox', {
  offset: Schemas.Vector3,
  boostAmount: Schemas.Number,
  isVisible: Schemas.Boolean,
  lastSwipeTime: Schemas.Number // For cooldown
})

// Tag component to mark penguin entity
export const Penguin = engine.defineComponent('penguin', {})

// Tag component to mark PenguinPlayer entity (follows Penguin, same movement as Broom)
export const PenguinPlayerTag = engine.defineComponent('penguinPlayerTag', {})

// Tag component to mark Broom entity (same movement as PenguinPlayer)
export const BroomTag = engine.defineComponent('broomTag', {})

// Tag component to mark Home01 target entity
export const HomeTarget = engine.defineComponent('homeTarget', {})

// Tag component to mark start button entity
export const StartButton = engine.defineComponent('startButton', {})

// Tag component to mark lose trigger entity
export const LoseTrigger = engine.defineComponent('loseTrigger', {})
