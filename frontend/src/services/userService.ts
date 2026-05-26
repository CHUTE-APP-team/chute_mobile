import { api } from './api';
import { UserRole } from '../utils/roleUtils';

export type Rank = 'Bronze' | 'Prata' | 'Ouro' | 'Elite';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  stars: number;
  starRatingsCount: number;
  starRatingsSum?: number;
  xp: number;
  level: number;
  rank: Rank;
  averageRating: number;
  totalMatches: number;
}

export interface PlayerStats {
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

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get('/users/me');
  return response.data.data as UserProfile;
}

export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const response = await api.get(`/users/${userId}/stats`);
  return response.data.data as PlayerStats;
}

export async function updateCurrentUser(data: { name?: string; role?: string }): Promise<UserProfile> {
  const response = await api.put('/users/me', data);
  return response.data.data as UserProfile;
}

export async function deleteCurrentUser(): Promise<void> {
  await api.delete('/users/me');
}
