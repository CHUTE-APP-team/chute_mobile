import { api } from './api';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  overall?: number;
  level?: number;
  rank?: string;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  createdBy: TeamMember;
  members: TeamMember[];
  createdAt: string;
}

export async function getMyTeams(): Promise<Team[]> {
  const res = await api.get('/teams');
  return res.data.data as Team[];
}

export async function getTeam(id: string): Promise<Team> {
  const res = await api.get(`/teams/${id}`);
  return res.data.data as Team;
}

export async function createTeam(data: { name: string; description?: string }): Promise<Team> {
  const res = await api.post('/teams', data);
  return res.data.data as Team;
}

export async function updateTeam(id: string, data: { name?: string; description?: string }): Promise<Team> {
  const res = await api.put(`/teams/${id}`, data);
  return res.data.data as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  await api.delete(`/teams/${id}`);
}

export async function addMember(teamId: string, email: string): Promise<Team> {
  const res = await api.post(`/teams/${teamId}/members`, { email });
  return res.data.data as Team;
}
