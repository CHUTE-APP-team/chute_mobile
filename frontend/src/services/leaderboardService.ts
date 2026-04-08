import { api } from './api';
import { Rank } from './userService';

export interface LeaderboardEntry {
  position: number;
  _id: string;
  name: string;
  xp: number;
  level: number;
  rank: Rank;
  overall: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await api.get('/users/leaderboard');
  return response.data.data as LeaderboardEntry[];
}
