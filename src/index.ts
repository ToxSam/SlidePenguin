import { engine } from '@dcl/sdk/ecs'
import { initializeGameEntities, gameStateSystem, penguinMovementSystem, swipeInputSystem, animationTransitionSystem } from './systems'
import { setupUi } from './ui'
import { isServer } from '~system/EngineApi'

export async function main() {
  // Initialize game entities and set up interactions
  initializeGameEntities()

  // Add game systems (animationTransitionSystem last so it processes transitions right before render)
  engine.addSystem(gameStateSystem)
  engine.addSystem(penguinMovementSystem)
  engine.addSystem(swipeInputSystem) // E key input handler
  engine.addSystem(animationTransitionSystem)

  // Initialize UI
  setupUi()

  if (await isServer({})) {
    console.log('asd')
  }
}
