import { Vector3 } from '@dcl/sdk/math'

// Game constants
// Speed system: Initial burst, then slow down (requires interaction)
// Without swipes: stops at ~18-19 units (short of 60 unit home) - requires many swipes
// With swipes: can reach home by reducing deceleration
// Distance formula: distance = initialSpeed² / (2 * deceleration)
// With 4.55 and 0.56: distance = 20.7 / 1.12 ≈ 18.5 units (30% reduced initial burst)
export const INITIAL_SPEED = 5.3 // Units per second - 30% reduced initial burst (6.5 * 0.7 = 4.55)
export const DECELERATION_RATE = 0.56 // Base speed loss per second (30% slower: 0.8 * 0.7 = 0.56)
export const SWIPE_DECELERATION_REDUCTION = 0.4 // Reduce deceleration by this amount per swipe
export const SWIPE_DECELERATION_DURATION = 2.0 // Seconds that deceleration is reduced after swipe (reduced duration)
export const COUNTDOWN_DURATION = 3 // Seconds (reduced from 7)
export const SWIPE_BOX_OFFSET = Vector3.create(0, 0, 2) // In front of penguin
export const MAX_SCORE = 1000 // Maximum possible score
export const SWIPE_COOLDOWN = 0.2 // Seconds between swipes (reduced for faster swiping)

// Swipe box visual properties
export const SWIPE_BOX_SIZE = Vector3.create(1, 1, 1)
export const SWIPE_BOX_ALPHA = 0.5 // Semi-transparent

// Penguin spinning (Transform rotation, not GLB animation)
export const ROTATION_SPEED_MULTIPLIER = 3600 // Degrees per second per unit of speed (~10 full rotations per second at speed 1)

// Penguin and Broom animation crossfade duration (seconds)
export const ANIMATION_TRANSITION_DURATION = 0.6

// Broom.glb: how long BroomSwipe plays before restoring BroomIdle01 (seconds)
export const BROOM_SWIPE_ANIMATION_DURATION = 0.5

// PenguinPlayer stops at this Z - no more swipes, no further movement (Penguin.glb keeps sliding until stop)
export const PENGUIN_PLAYER_STOP_Z = 58

// Player teleport when clicking "Play Again" (same area as penguin start)
export const PLAYER_INITIAL_POSITION = { x: 8, y: 0, z: 4 }
export const PLAYER_INITIAL_CAMERA_TARGET = { x: 8, y: 0, z: 20 } // Look along the track
