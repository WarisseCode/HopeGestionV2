/**
 * @hopegestion/api-client — Locataires API
 * Compatible web + mobile
 */
import { apiCall } from './core';
import type { Locataire, LocataireDetails } from '@hopegestion/shared-types';

export async function getLocataires(type?: string, search?: string): Promise<Locataire[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiCall<{ locataires: Locataire[] }>(`/locataires${query}`);
  return data.locataires || [];
}

export async function getLocataireDetails(id: number): Promise<LocataireDetails> {
  return apiCall<LocataireDetails>(`/locataires/${id}`);
}

export async function createLocataire(data: Partial<Locataire>): Promise<number> {
  const res = await apiCall<{ id: number }>('/locataires', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.id;
}

export async function updateLocataire(id: number, data: Partial<Locataire>): Promise<void> {
  return apiCall<void>(`/locataires/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLocataire(id: number): Promise<void> {
  return apiCall<void>(`/locataires/${id}`, { method: 'DELETE' });
}

export async function approveLocataire(id: number): Promise<void> {
  return apiCall<void>(`/locataires/${id}/approve`, { method: 'POST' });
}

export async function rejectLocataire(id: number): Promise<void> {
  return apiCall<void>(`/locataires/${id}/reject`, { method: 'POST' });
}
