import { api } from './api'

export interface DrawPlayer {
  name: string
  stars: number
}

export interface DrawnTeam {
  name: string
  players: DrawPlayer[]
  totalStars: number
  avgStars: number
}

export interface DrawResult {
  teams: DrawnTeam[]
  totalPlayers: number
}

export async function drawTeamsStandalone(
  players: DrawPlayer[],
  teamSize: number
): Promise<DrawResult> {
  const res = await api.post('/api/draw-teams', { players, teamSize })
  return res.data?.data ?? res.data
}

export async function rateUserStars(
  userId: string,
  stars: number
): Promise<{ stars: number; starRatingsCount: number }> {
  const res = await api.post(`/api/users/${userId}/rate-stars`, { stars })
  return res.data?.data ?? res.data
}
