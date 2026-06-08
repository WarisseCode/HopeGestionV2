import { getToken } from './authApi';
import { API_URL } from '../config';
import type { Immeuble, Lot } from '@hopegestion/shared-types';
export type { Immeuble, Lot };

// Fonction pour récupérer les immeubles
export async function getImmeubles(): Promise<Immeuble[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/immeubles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.immeubles || [];
}

// Fonction pour récupérer les lots
export async function getLots(): Promise<Lot[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/lots`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.lots || [];
}

// Fonction pour créer ou mettre à jour un immeuble
export async function saveImmeuble(immeuble: Partial<Immeuble>): Promise<Immeuble> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/immeubles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(immeuble),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour créer ou mettre à jour un lot
export async function saveLot(lot: Partial<Lot>): Promise<Lot> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/lots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lot),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour supprimer un immeuble
export async function deleteImmeuble(id: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/immeubles/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
}

// Fonction pour supprimer un lot
export async function deleteLot(id: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/lots/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
}