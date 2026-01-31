import { Entity } from '@dcl/sdk/ecs'
import { GameState } from './components'

export type GameStateType = 'idle' | 'countdown' | 'playing' | 'ended'

export function getGameState(entity: Entity): GameStateType | null {
  if (!GameState.has(entity)) return null
  return GameState.get(entity).state as GameStateType
}

export function setGameState(entity: Entity, state: GameStateType, countdownValue: number = 0, score: number = 0, hasLost: boolean = false, distanceToHome: number = 0, canSwipe: boolean = true) {
  const mutable = GameState.getMutable(entity)
  mutable.state = state
  mutable.countdownValue = countdownValue
  mutable.score = score
  mutable.hasLost = hasLost
  mutable.distanceToHome = distanceToHome
  mutable.canSwipe = canSwipe
}

export function resetGameState(entity: Entity) {
  setGameState(entity, 'idle', 0, 0, false, 0)
}
