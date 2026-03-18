import { api } from './api';
import { saveToken, removeToken } from './tokenService';

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const { token } = response.data.data;
  await saveToken(token);
  return response.data;
}

export async function register(name: string, email: string, password: string) {
  const response = await api.post('/auth/register', { name, email, password });
  const { token } = response.data.data;
  await saveToken(token);
  return response.data;
}

export async function logout(): Promise<void> {
  await removeToken();
}
