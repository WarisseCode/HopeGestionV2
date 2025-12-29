// frontend/src/api/propertyApi.ts
import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/biens`;

export interface Immeuble {
  id: number;
  nom: string;
  type: string;
  adresse: string;
  ville: string;
  pays: string;
  description?: string;
  photo?: string;
  owner_id: number;
  owner_name?: string;
  nbLots?: number;
  occupation?: number;
  statut?: string;
}

export interface Lot {
  id: number;
  reference: string;
  type: string;
  immeuble: string; // Nom immeuble (affichage)
  building_id?: number; // ID immeuble (technique)
  owner_id?: number;
  owner_name?: string;
  etage: string;
  superficie: number;
  nbPieces: number;
  loyer: number;
  charges: number;
  statut: string;
  description?: string;
  photos?: string[];
}

// Récupérer les immeubles
export async function getImmeubles(): Promise<Immeuble[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/immeubles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.immeubles || [];
}

// Récupérer les lots
export async function getLots(): Promise<Lot[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/lots`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.lots || [];
}

// Sauvegarder un immeuble
export async function saveImmeuble(immeuble: Partial<Immeuble>): Promise<Immeuble> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/immeubles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(immeuble),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Sauvegarder un lot
export async function saveLot(lot: Partial<Lot>): Promise<Lot> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/lots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lot),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Supprimer un immeuble
export async function deleteImmeuble(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/immeubles/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }
}

// Supprimer un lot
export async function deleteLot(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/lots/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }
}
