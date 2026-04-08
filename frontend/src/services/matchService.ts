import { api } from './api';

export interface Player {
  _id: string;
  name: string;
  overall: number;
}

export interface Team {
  name: string;
  players: Player[];
  totalOverall: number;
}

export interface Match {
  _id: string;
  title: string;
  location: string;
  date: string;
  maxPlayers: number;
  players: string[];
  createdBy: string;
  teams: Team[];
  teamsGeneratedAt?: string;
  createdAt: string;
}

export interface MatchDetail extends Omit<Match, 'players'> {
  players: Player[];
}

export interface CreateMatchData {
  title: string;
  location: string;
  date: string;
  maxPlayers: number;
}

export async function getMatches(): Promise<Match[]> {
  const response = await api.get('/matches');
  console.log('[matchService] GET /matches raw response:', JSON.stringify(response.data));
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function createMatch(data: CreateMatchData): Promise<Match> {
  const response = await api.post('/matches', data);
  return response.data.data as Match;
}

export async function getMatch(matchId: string): Promise<MatchDetail> {
  const response = await api.get(`/matches/${matchId}?$expand=players,teams.players`);
  return response.data.data as MatchDetail;
}

export async function joinMatch(matchId: string): Promise<Match> {
  const response = await api.post(`/matches/${matchId}/join`);
  return response.data.data as Match;
}

export async function joinMatchDetail(matchId: string): Promise<MatchDetail> {
  const response = await api.post(`/matches/${matchId}/join`);
  return response.data.data as MatchDetail;
}

export async function generateTeams(matchId: string): Promise<Team[]> {
  const response = await api.post(`/matches/${matchId}/generate-teams`);
  return response.data.data.teams as Team[];
}
