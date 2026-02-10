import { engine } from '@dcl/sdk/ecs'
import { initializeGameEntities, gameStateSystem, penguinMovementSystem, swipeInputSystem, animationTransitionSystem } from './systems'
import { setupUi } from './ui'
import { isServer } from '@dcl/sdk/network'
import { room } from './shared/messages'

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

  if (isServer()) {
    console.log('[Server] Ready for ping')
    room.onMessage('ping', (data, context) => {
      const to = context?.from
      console.log(`[Server] ping from ${to ?? 'unknown'} at ${data.clientTime}`)
      void room.send('pong', { clientTime: data.clientTime, serverTime: Date.now() }, to ? { to: [to] } : undefined)
    })
  } else {
    room.onMessage('pong', (data) => {
      const rttMs = Date.now() - data.clientTime
      console.log(`[Client] pong rtt=${rttMs}ms serverTime=${data.serverTime}`)
    })

    const clientTime = Date.now()
    console.log('[Client] sending ping')
    void room.send('ping', { clientTime })
  }
}
