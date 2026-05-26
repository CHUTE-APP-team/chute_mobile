import { api } from './api'

export interface StatPlayer {
  name: string
  goals: number
  assists: number
}

export interface StatSession {
  _id: string
  team: string | { _id: string; name: string }
  matchId?: string | null
  date: string
  label: string
  players: StatPlayer[]
  createdBy: string
  createdAt: string
}

export interface AggregatedPlayer extends StatPlayer {
  total: number
  sessions: number
}

export interface TeamStatsAggregate {
  players: AggregatedPlayer[]
  totalSessions: number
}

export async function listStatSessions(teamId: string): Promise<StatSession[]> {
  const res = await api.get('/api/stat-sessions', { params: { teamId } })
  return res.data?.data ?? res.data ?? []
}

export async function createStatSession(data: {
  teamId: string; date: string; label?: string; matchId?: string; players: StatPlayer[]
}): Promise<StatSession> {
  const res = await api.post('/api/stat-sessions', data)
  return res.data?.data ?? res.data
}

export async function updateStatSession(
  id: string,
  data: Partial<{ label: string; date: string; players: StatPlayer[] }>
): Promise<StatSession> {
  const res = await api.put(`/api/stat-sessions/${id}`, data)
  return res.data?.data ?? res.data
}

export async function deleteStatSession(id: string): Promise<void> {
  await api.delete(`/api/stat-sessions/${id}`)
}

export async function aggregateTeamStats(teamId: string): Promise<TeamStatsAggregate> {
  const res = await api.get(`/api/stat-sessions/team/${teamId}/aggregate`)
  return res.data?.data ?? res.data
}
