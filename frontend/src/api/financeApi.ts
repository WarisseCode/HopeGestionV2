// frontend/src/api/financeApi.ts
import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/finances`;

// Interfaces pour les données financières
export interface Paiement {
  id: number;
  reference: string;
  locataire: string;
  lot: string;
  date: string;
  type: string;
  montant: number;
  modePaiement: string;
  statut: string;
  fichier: string;
}

export interface Depense {
  id: number;
  reference: string;
  fournisseur: string;
  type: string;
  date: string;
  montant: number;
  statut: string;
  fichier: string;
}

// Fonction pour récupérer les paiements
export async function getPaiements(): Promise<Paiement[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/paiements`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.paiements || [];
}

// Fonction pour récupérer les dépenses
export async function getDepenses(): Promise<Depense[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch('http://localhost:5000/api/finances/depenses', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.depenses || [];
}

// Fonction pour créer ou mettre à jour un paiement
export async function savePaiement(paiement: Partial<Paiement>): Promise<Paiement> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/paiements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paiement),
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour créer ou mettre à jour une dépense
export async function saveDepense(depense: Partial<Depense>): Promise<Depense> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch('http://localhost:5000/api/finances/depenses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(depense),
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour supprimer un paiement
export async function deletePaiement(id: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/paiements/${id}`, {
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

// Fonction pour supprimer une dépense
export async function deleteDepense(id: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/depenses/${id}`, {
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