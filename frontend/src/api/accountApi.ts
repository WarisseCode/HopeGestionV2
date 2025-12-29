// frontend/src/api/accountApi.ts
import { getToken } from './authApi';

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

  const response = await fetch('http://localhost:5000/api/compte/proprietaires', {
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

  const response = await fetch('http://localhost:5000/api/compte/utilisateurs', {
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

  const response = await fetch('http://localhost:5000/api/compte/autorisations', {
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

  const response = await fetch('http://localhost:5000/api/compte/proprietaires', {
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

  const response = await fetch('http://localhost:5000/api/compte/utilisateurs', {
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

  const response = await fetch('http://localhost:5000/api/compte/autorisations', {
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