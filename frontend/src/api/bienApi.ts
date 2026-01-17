import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/biens`;

// Interfaces pour les données de biens
export interface Immeuble {
  id: number;
  nom: string;
  type: string;
  adresse: string;
  ville: string;
  pays: string;
  nbLots: number;
  occupation: number;
  statut: string;
  photo?: string | null;
  description?: string;
  proprietaire?: string;
  gestionnaire?: string;
  // Nouveaux champs
  owner_id?: number;
  latitude?: number | null;
  longitude?: number | null;
  quartier?: string | null;
  gestionnaire_id?: number | null;
  gestionnaire_name?: string | null;
  photos?: string[];
  video_url?: string | null;
  plan_masse_url?: string | null;
  nombre_etages?: number;
}

export interface Lot {
  id: number;
  reference: string;
  type: string;
  immeuble: string;
  building_id?: number;
  etage: string;
  bloc?: string | null;
  superficie: number;
  nbPieces: number;
  loyer: number;
  charges: number;
  statut: string;
  description: string;
  // Données locatives
  periodicite?: string; // mensuel, trimestriel, annuel
  caution?: number;
  avance?: number; // nombre de mois
  // Données de vente
  prix_vente?: number | null;
  modalite_vente?: string | null; // comptant, echelonne
  duree_echelonnement?: number | null; // mois
  // Médias
  photos?: string[];
  date_disponibilite?: string | null;
  // Owner info
  owner_id?: number;
  owner_name?: string;
}

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
    throw new Error(`Erreur: ${response.status}`);
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
    throw new Error(`Erreur: ${response.status}`);
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
    throw new Error(`Erreur: ${response.status}`);
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
    throw new Error(`Erreur: ${response.status}`);
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
    throw new Error(`Erreur: ${response.status}`);
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
    throw new Error(`Erreur: ${response.status}`);
  }
}