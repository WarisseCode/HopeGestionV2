/**
 * @hopegestion/api-client — Biens API
 * Compatible web + mobile
 */
import { apiCall } from './core';
import type { Immeuble, Lot } from '@hopegestion/shared-types';

export async function getImmeubles(): Promise<Immeuble[]> {
  const data = await apiCall<{ immeubles: Immeuble[] }>('/biens/immeubles');
  return data.immeubles || [];
}

export async function getImmeuble(id: number): Promise<Immeuble> {
  return apiCall<Immeuble>(`/biens/immeubles/${id}`);
}

export async function getLots(immeubleId?: number): Promise<Lot[]> {
  const params = immeubleId ? `?building_id=${immeubleId}` : '';
  const data = await apiCall<{ lots: Lot[] }>(`/biens/lots${params}`);
  return data.lots || [];
}

export async function saveImmeuble(immeuble: Partial<Immeuble>): Promise<Immeuble> {
  if (immeuble.id) {
    return apiCall<Immeuble>(`/biens/immeubles/${immeuble.id}`, {
      method: 'PUT',
      body: JSON.stringify(immeuble),
    });
  }
  return apiCall<Immeuble>('/biens/immeubles', {
    method: 'POST',
    body: JSON.stringify(immeuble),
  });
}

export async function deleteImmeuble(id: number): Promise<void> {
  return apiCall<void>(`/biens/immeubles/${id}`, { method: 'DELETE' });
}

export async function saveLot(lot: Partial<Lot>): Promise<Lot> {
  if (lot.id) {
    return apiCall<Lot>(`/biens/lots/${lot.id}`, {
      method: 'PUT',
      body: JSON.stringify(lot),
    });
  }
  return apiCall<Lot>('/biens/lots', {
    method: 'POST',
    body: JSON.stringify(lot),
  });
}

export async function deleteLot(id: number): Promise<void> {
  return apiCall<void>(`/biens/lots/${id}`, { method: 'DELETE' });
}
