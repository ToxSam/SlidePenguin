import { engine } from '@dcl/sdk/ecs'
import { initializeGameEntities, gameStateSystem, penguinMovementSystem, swipeInputSystem, animationTransitionSystem, penguinFriendShakeSystem } from './systems'
import { setupUi } from './ui'

export function main() {
  // Initialize game entities and set up interactions
  initializeGameEntities()

  // Add game systems (animationTransitionSystem last so it processes transitions right before render)
  engine.addSystem(gameStateSystem)
  engine.addSystem(penguinMovementSystem)
  engine.addSystem(swipeInputSystem) // E key input handler
  engine.addSystem(animationTransitionSystem)
  engine.addSystem(penguinFriendShakeSystem)

  // Initialize UI
  setupUi()
}
