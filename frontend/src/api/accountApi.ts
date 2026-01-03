// frontend/src/api/accountApi.ts
import { getToken } from './authApi';
import { API_URL } from '../config';

// Interfaces pour les données de compte
export interface Proprietaire {
  id: number;
  type: string;
  nom: string;
  prenom?: string;
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  numeroPiece: string;
  photo?: string | null;
  modeGestion?: string;
  mobileMoney?: string;
  rccmNumber?: string;
}

export interface Utilisateur {
  id: number;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  role: string;
  photo?: string | null;
  statut: string;
}

export interface Autorisation {
  utilisateur: string;
  proprietaire: string;
  modules: {
    biens: boolean;
    finances: boolean;
    locataires: boolean;
    paiements: boolean;
    contrats: boolean;
    interventions: boolean;
  };
  niveauAcces: {
    lecture: boolean;
    ecriture: boolean;
    suppression: boolean;
    validation: boolean;
  };
  dateDebut: string;
  dateFin?: string;
}

// Fonction pour récupérer les propriétaires
export async function getProprietaires(): Promise<Proprietaire[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/proprietaires`, {
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
  return data.proprietaires || [];
}

// Fonction pour récupérer les utilisateurs
export async function getUtilisateurs(): Promise<Utilisateur[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/utilisateurs`, {
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
  return data.utilisateurs || [];
}

// Fonction pour récupérer les autorisations
export async function getAutorisations(): Promise<Autorisation[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/autorisations`, {
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
  return data.autorisations || [];
}

// Fonction pour créer ou mettre à jour un propriétaire
export async function saveProprietaire(proprietaire: Partial<Proprietaire>): Promise<Proprietaire> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/proprietaires`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(proprietaire),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour créer ou mettre à jour un utilisateur
export async function saveUtilisateur(utilisateur: Partial<Utilisateur>): Promise<Utilisateur> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/utilisateurs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(utilisateur),
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  return await response.json();
}

// Fonction pour attribuer des autorisations
export async function saveAutorisation(autorisation: Partial<Autorisation>): Promise<Autorisation> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/compte/autorisations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(autorisation),
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  return await response.json();
}

// Delete (soft) proprietaire
export async function deleteProprietaire(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/proprietaires/${id}`, {
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

// Delete (suspend) utilisateur
export async function deleteUtilisateur(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs/${id}`, {
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

// Reactivate utilisateur
export async function reactivateUtilisateur(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs/${id}/reactivate`, {
    method: 'PATCH',
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

// Get proprietaire's properties
export async function getProprietaireBiens(id: number): Promise<any> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/proprietaires/${id}/biens`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}