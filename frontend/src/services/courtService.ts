import { api } from './api'

export type Modality = 'futsal' | 'society' | 'campo'

export interface Court {
  _id: string
  name: string
  address: string
  modality: Modality
  createdBy: string
  createdAt: string
}

export const MODALITY_LABELS: Record<Modality, string> = {
  futsal: 'Futsal',
  society: 'Society',
  campo: 'Campo',
}

export const MODALITY_ICONS: Record<Modality, string> = {
  futsal: '🏟️',
  society: '⚽',
  campo: '🌿',
}

export async function listCourts(modality?: Modality): Promise<Court[]> {
  const params = modality ? { modality } : {}
  const res = await api.get('/api/courts', { params })
  return res.data?.data ?? res.data ?? []
}

export async function createCourt(data: {
  name: string; address: string; modality: Modality
}): Promise<Court> {
  const res = await api.post('/api/courts', data)
  return res.data?.data ?? res.data
}

export async function updateCourt(
  id: string,
  data: Partial<{ name: string; address: string; modality: Modality }>
): Promise<Court> {
  const res = await api.put(`/api/courts/${id}`, data)
  return res.data?.data ?? res.data
}

export async function deleteCourt(id: string): Promise<void> {
  await api.delete(`/api/courts/${id}`)
}
