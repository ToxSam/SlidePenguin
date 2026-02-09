import ReactEcs from '@dcl/sdk/react-ecs'
import { engine, Entity } from '@dcl/sdk/ecs'
import { GameState } from '../components'
import { FriendDialog } from './screens/FriendDialog'
import { CountdownOverlay } from './screens/CountdownOverlay'
import { PlayingHud } from './screens/PlayingHud'
import { EndedPanel } from './screens/EndedPanel'

export function RootUi() {
  let gameStateEntity: Entity | null = null
  for (const [entity] of engine.getEntitiesWith(GameState)) {
    gameStateEntity = entity
    break
  }

  if (!gameStateEntity || !GameState.has(gameStateEntity)) {
    return null
  }

  const g = GameState.get(gameStateEntity)
  const state = g.state
  const showPenguinFriendDialog = g.showPenguinFriendDialog ?? false

  if (state === 'idle' && showPenguinFriendDialog) {
    return <FriendDialog />
  }

  if (state === 'countdown') {
    return (
      <CountdownOverlay
        countdownValue={g.countdownValue}
        shakeX={g.countdownShakeX ?? 0}
        shakeY={g.countdownShakeY ?? 0}
      />
    )
  }

  if (state === 'playing') {
    return (
      <PlayingHud
        distanceToHome={g.distanceToHome}
        canSwipe={g.canSwipe ?? true}
      />
    )
  }

  if (state === 'ended') {
    return (
      <EndedPanel
        score={g.score}
        distanceToHome={g.distanceToHome}
        hasLost={g.hasLost}
      />
    )
  }

  return null
}
