import { api } from './api';

export interface Match {
  _id: string;
  title: string;
  location: string;
  date: string;
  maxPlayers: number;
  players: string[];
  createdBy: string;
  createdAt: string;
}

export interface CreateMatchData {
  title: string;
  location: string;
  date: string;
  maxPlayers: number;
}

export async function getMatches(): Promise<Match[]> {
  const response = await api.get('/matches');
  return response.data.data as Match[];
}

export async function createMatch(data: CreateMatchData): Promise<Match> {
  const response = await api.post('/matches', data);
  return response.data.data as Match;
}

export async function joinMatch(matchId: string): Promise<Match> {
  const response = await api.post(`/matches/${matchId}/join`);
  return response.data.data as Match;
}
