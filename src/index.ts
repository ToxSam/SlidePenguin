import { engine, MeshCollider, MeshRenderer, RealmInfo, Transform } from '@dcl/sdk/ecs'
import { isServer, syncEntity } from '@dcl/sdk/network'
import { initializeGameEntities, gameStateSystem, penguinMovementSystem, swipeInputSystem, animationTransitionSystem } from './systems'
import { setupUi } from './ui'
import { server as startServer } from './server/server'
import { room } from './shared/messages'
import { initLeaderboardClient, getLeaderboardEntries, notifyRoomReady } from './leaderboard/leaderboardClient'
import { setupWorldLeaderboard } from './leaderboard/WorldLeaderboard'

export async function main() {
   createSyncedEntity()
  if (isServer()) {
    startServer()
    return
  } else {
    console.log('[CLIENT] Running on client')
  }

  let canPing = false
  room.onReady((isReady) => {
    console.log('[ROOM] ready =', isReady)
    if (isReady) canPing = true
  })

  room.onMessage('ping', (data) => {
    console.log('[ROOM] ping from server ts =', data.ts)
    room.send('pong', { ts: Date.now() })
    notifyRoomReady()
  })
  room.onMessage('pong', (data) => {
    console.log('[ROOM] pong from server ts =', data.ts)
    notifyRoomReady()
  })
  
  initLeaderboardClient()
  setupWorldLeaderboard(getLeaderboardEntries)

  let loggedRealmReady = false
  let lastPingAt = 0
  engine.addSystem(() => {
    if (loggedRealmReady) return
    const info = RealmInfo.getOrNull(engine.RootEntity)
    if (info?.isConnectedSceneRoom) {
      loggedRealmReady = true
      console.log('[REALM] connected to scene room')
    }
  })

  engine.addSystem((dt) => {
    const info = RealmInfo.getOrNull(engine.RootEntity)
    if (!info?.isConnectedSceneRoom) return
    if (!canPing) return
    lastPingAt += dt
    if (lastPingAt < 2) return
    lastPingAt = 0
    room.send('ping', { ts: Date.now() })
  })

  // Initialize game entities and set up interactions
  initializeGameEntities()
 

  // Add game systems (animationTransitionSystem last so it processes transitions right before render)
  engine.addSystem(gameStateSystem)
  engine.addSystem(penguinMovementSystem)
  engine.addSystem(swipeInputSystem) // E key input handler
  engine.addSystem(animationTransitionSystem)

  // Initialize UI
  setupUi()
}

function createSyncedEntity() {
  const entity = engine.addEntity()
  Transform.create(entity, { position: { x: 8, y: 1, z: 8 } })
  // MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  syncEntity(entity, [Transform.componentId, MeshRenderer.componentId], 1)
  return entity
}

export function server() {
  startServer()
}
