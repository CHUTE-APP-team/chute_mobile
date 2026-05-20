import { api } from './api';

export interface MatchInvite {
  _id: string;
  title: string;
  location: string;
  date: string;
  maxPlayers: number;
  players: string[];
  invites: string[];
  createdBy: { _id: string; name: string };
}

export async function getMyInvites(): Promise<MatchInvite[]> {
  const res = await api.get('/matches/my-invites');
  const data = res.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function acceptInvite(matchId: string): Promise<void> {
  await api.post(`/matches/${matchId}/join`);
}

export async function declineInvite(matchId: string): Promise<void> {
  await api.post(`/matches/${matchId}/leave`);
}

export async function inviteToMatch(matchId: string, email: string): Promise<void> {
  await api.post(`/matches/${matchId}/invite`, { email });
}

export async function leaveMatch(matchId: string): Promise<void> {
  await api.post(`/matches/${matchId}/leave`);
}
