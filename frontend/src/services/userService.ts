import { api } from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get('/users/me');
  return response.data.data as UserProfile;
}
