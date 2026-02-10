export const LEADERBOARD_ALL_TIME_KEY = 'leaderboard:allTime'

export type LeaderboardEntry = {
  address: string
  displayName: string
  bestScore: number
  playCount: number
}
