import { Vector3 } from '@dcl/sdk/math'
import { Entity, Transform } from '@dcl/sdk/ecs'
import { MAX_SCORE } from './constants'

/**
 * Calculate 2D distance between two positions (ignoring Y-axis)
 */
export function calculateDistance2D(pos1: Vector3, pos2: Vector3): number {
  const dx = pos1.x - pos2.x
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Calculate score based on distance from target center
 * Less meters = more points
 * @param penguinPosition - Final position of penguin
 * @param targetPosition - Center position of Home01
 * @param maxDistance - Maximum possible distance (for normalization, default 60 for z:5 to z:65)
 * @returns Score from 0 to MAX_SCORE
 */
export function calculateScore(
  penguinPosition: Vector3,
  targetPosition: Vector3,
  maxDistance: number = 60
): number {
  const distance = calculateDistance2D(penguinPosition, targetPosition)
  
  // Normalize distance (0 to 1, where 0 = on target, 1 = max distance)
  const normalizedDistance = Math.min(1, distance / maxDistance)
  
  // Score is inversely proportional to distance
  // Less meters = higher score
  // Formula: MAX_SCORE * (1 - normalizedDistance)
  // If distance is 0m, score is MAX_SCORE
  // If distance is maxDistance, score is 0
  const score = MAX_SCORE * (1 - normalizedDistance)
  
  return Math.max(0, Math.round(score))
}

/**
 * Get the center position of an entity (using its Transform)
 */
export function getEntityCenter(entity: Entity): Vector3 | null {
  if (!Transform.has(entity)) return null
  return Transform.get(entity).position
}
