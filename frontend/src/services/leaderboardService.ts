import { api } from './api';
import { Rank } from './userService';

export interface RankingEntry {
  position: number;
  _id: string;
  name: string;
  stars: number;
  starRatingsCount: number;
  averageRating: number;
  totalMatches: number;
  xp: number;
  level: number;
  rank: Rank;
}

export interface RankingPage {
  ranking: RankingEntry[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// kept for backward compat (ProfileScreen still uses it via leaderboard route)
export interface LeaderboardEntry {
  position: number;
  _id: string;
  name: string;
  xp: number;
  level: number;
  rank: Rank;
  stars: number;
  starRatingsCount: number;
}

export async function getRanking(page = 1, limit = 20): Promise<RankingPage> {
  const response = await api.get('/users/ranking', { params: { page, limit } });
  return response.data.data as RankingPage;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await api.get('/users/leaderboard');
  return response.data.data as LeaderboardEntry[];
}
