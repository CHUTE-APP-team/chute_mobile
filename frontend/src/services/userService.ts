import { api } from './api';
import { UserRole } from '../utils/roleUtils';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get('/users/me');
  return response.data.data as UserProfile;
}
