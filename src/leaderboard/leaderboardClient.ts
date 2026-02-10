import { room, onRoomReady, isRoomReady } from '../shared/messages'
import { LeaderboardEntry } from '../shared/leaderboard'

let entries: LeaderboardEntry[] = []
let roomReady = false
let pendingScore: number | null = null

export function initLeaderboardClient() {
  roomReady = false
  if (isRoomReady()) {
    notifyRoomReady()
  }

  onRoomReady((isReady) => {
    if (!isReady) return
    notifyRoomReady()
  })

  room.onMessage('leaderboardUpdate', (data) => {
    console.log('[LEADERBOARD] update received, entries =', data.entries?.length ?? 0)
    entries = data.entries ?? []
  })
}

export function notifyRoomReady() {
  if (roomReady) return
  roomReady = true
  console.log('[LEADERBOARD] room ready, requesting snapshot')
  room.send('getLeaderboard', {})
  if (pendingScore !== null) {
    const score = pendingScore
    pendingScore = null
    console.log('[LEADERBOARD] submitting pending score =', score)
    room.send('submitScore', { score: Math.round(score) })
  }
}

export function getLeaderboardEntries(): LeaderboardEntry[] {
  return entries
}

export function submitScore(score: number) {
  if (!Number.isFinite(score) || score <= 0) return
  if (!roomReady && isRoomReady()) {
    notifyRoomReady()
  }
  if (!roomReady) {
    pendingScore = score
    console.log('[LEADERBOARD] room not ready, queued score =', score)
    return
  }
  console.log('[LEADERBOARD] submitting score =', score)
  room.send('submitScore', { score: Math.round(score) })
}
