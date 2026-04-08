import { api } from './api';
import { UserRole } from '../utils/roleUtils';

export type Rank = 'Bronze' | 'Prata' | 'Ouro' | 'Elite';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  overall: number;
  xp: number;
  level: number;
  rank: Rank;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get('/users/me');
  return response.data.data as UserProfile;
}
