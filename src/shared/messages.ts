import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const Messages = {
  ping: Schemas.Map({
    ts: Schemas.Number
  }),
  pong: Schemas.Map({
    ts: Schemas.Number
  }),
  submitScore: Schemas.Map({
    score: Schemas.Int
  }),
  leaderboardUpdate: Schemas.Map({
    entries: Schemas.Array(
      Schemas.Map({
        address: Schemas.String,
        displayName: Schemas.String,
        bestScore: Schemas.Int,
        playCount: Schemas.Int
      })
    )
  }),
  getLeaderboard: Schemas.Map({})
}

export const room = registerMessages(Messages)

let roomReady = false
const readyListeners: Array<(ready: boolean) => void> = []

room.onReady((isReady) => {
  roomReady = isReady
  console.log('[ROOM] ready =', isReady)
  for (const listener of readyListeners) {
    listener(isReady)
  }
})

export function isRoomReady() {
  return roomReady
}

export function onRoomReady(cb: (ready: boolean) => void) {
  readyListeners.push(cb)
  if (roomReady) cb(true)
}
