import { isServer } from '@dcl/sdk/network'
import { AvatarBase, PlayerIdentityData, engine } from '@dcl/sdk/ecs'
import { Storage } from '@dcl/sdk/server'
import { room } from '../shared/messages'
import { LEADERBOARD_ALL_TIME_KEY, LeaderboardEntry } from '../shared/leaderboard'

export function server() {
  console.log('[SERVER] Running on server, isServer =', isServer())

  room.onReady((isReady) => {
    if (!isReady) return
    console.log('[SERVER] Room ready, sending ping')
    room.send('ping', { ts: Date.now() })
    void loadLeaderboard()
  })

  room.onMessage('ping', (data, context) => {
    if (!context) return
    console.log('[SERVER] ping received from', context.from, 'ts =', data.ts)
    room.send('pong', { ts: Date.now() })
  })

  room.onMessage('submitScore', async (data, context) => {
    if (!context) return
    const score = Number(data?.score ?? 0)
    if (!Number.isFinite(score) || score <= 0) return
    console.log('[SERVER] submitScore received', { from: context.from, score })

    const address = context.from.toLowerCase()
    const displayName = getPlayerName(address)
    const existing = leaderboardByAddress.get(address)
    const bestScore = existing ? Math.max(existing.bestScore, score) : score
    const playCount = (existing?.playCount ?? 0) + 1

    leaderboardByAddress.set(address, {
      address,
      displayName,
      bestScore,
      playCount
    })

    await persistLeaderboard()
    broadcastLeaderboard()
  })

  room.onMessage('getLeaderboard', (_data, context) => {
    if (context) {
      console.log('[SERVER] getLeaderboard from', context.from)
    }
    broadcastLeaderboard()
  })
}

const leaderboardByAddress = new Map<string, LeaderboardEntry>()

function getPlayerName(address: string): string {
  for (const [_, identity, avatarBase] of engine.getEntitiesWith(PlayerIdentityData, AvatarBase)) {
    if (identity.address.toLowerCase() === address) {
      return avatarBase?.name || address.substring(0, 8)
    }
  }
  return address.substring(0, 8)
}

async function loadLeaderboard() {
  try {
    const stored = await Storage.get<string>(LEADERBOARD_ALL_TIME_KEY)
    if (!stored) {
      broadcastLeaderboard()
      return
    }
    const entries = JSON.parse(stored) as LeaderboardEntry[]
    leaderboardByAddress.clear()
    for (const entry of entries) {
      if (!entry?.address) continue
      leaderboardByAddress.set(entry.address.toLowerCase(), {
        address: entry.address.toLowerCase(),
        displayName: entry.displayName || entry.address.substring(0, 8),
        bestScore: Number(entry.bestScore) || 0,
        playCount: Number(entry.playCount) || 0
      })
    }
    broadcastLeaderboard()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404 || message.includes('404')) {
      // No data yet - treat as empty
      leaderboardByAddress.clear()
      broadcastLeaderboard()
      return
    }
    console.error('[Server][Storage] Failed to load leaderboard:', error)
  }
}

async function persistLeaderboard() {
  try {
    const entries = getSortedEntries()
    await Storage.set(LEADERBOARD_ALL_TIME_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error('[Server][Storage] Failed to save leaderboard:', error)
  }
}

function broadcastLeaderboard() {
  room.send('leaderboardUpdate', { entries: getSortedEntries() })
}

function getSortedEntries(): LeaderboardEntry[] {
  return Array.from(leaderboardByAddress.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 50)
}
