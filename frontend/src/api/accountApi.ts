// frontend/src/api/accountApi.ts
import { getToken } from './authApi';
import { API_URL } from '../config';

// Interfaces
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
  company_name?: string;
  rccm_number?: string;
  mobile_money?: string;
  management_mode?: 'direct' | 'delegated';
  delegation_start_date?: string;
  delegation_end_date?: string;
}

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  prenoms?: string; // Legacy support
  telephone: string;
  email: string;
  role: string;
  photo?: string | null;
  statut: string;
  photo_url?: string;
  preferences?: any;
}

export interface Autorisation {
  utilisateur: string;
  proprietaire: string;
  modules: any;
  niveauAcces: any;
  dateDebut: string;
  dateFin?: string;
}

// --- Fonctions Individuelles (Legacy / French) ---

export async function getProprietaires(): Promise<Proprietaire[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/proprietaires`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
  return (await response.json()).proprietaires || [];
}

export async function getUtilisateurs(): Promise<Utilisateur[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
  return (await response.json()).utilisateurs || [];
}

export async function saveProprietaire(proprietaire: any): Promise<Proprietaire> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const url = proprietaire.id 
    ? `${API_URL}/compte/proprietaires/${proprietaire.id}`
    : `${API_URL}/compte/proprietaires`;

  const method = proprietaire.id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(proprietaire),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
  return await response.json();
}

export async function saveUtilisateur(utilisateur: any): Promise<Utilisateur> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(utilisateur),
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function deleteProprietaire(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/proprietaires/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
}

export async function deleteUtilisateur(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
}

// --- Nouvelles Méthodes (Profile) ---

export async function getProfile(): Promise<Utilisateur> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erreur chargement profil');
  return await response.json();
}

export async function updateProfile(data: any): Promise<Utilisateur> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erreur mise à jour profil');
  return await response.json();
}

// --- Restored Missing Functions ---

export async function getAutorisations(): Promise<Autorisation[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/autorisations`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur: ${response.status}`);
  }
  return (await response.json()).autorisations || [];
}

export async function saveAutorisation(autorisation: any): Promise<Autorisation> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/autorisations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(autorisation),
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function reactivateUtilisateur(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/compte/utilisateurs/${id}/reactivate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
}

export async function getProprietaireBiens(id: number): Promise<any> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
  
    const response = await fetch(`${API_URL}/compte/proprietaires/${id}/biens`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur: ${response.status}`);
    }
  
    return await response.json();
  }


// --- UNIFIED EXPORT OBJECT (Pour compatibilité avec les nouveaux composants) ---
export const accountApi = {
    getProprietaires,
    getUtilisateurs,
    saveProprietaire,
    saveUtilisateur, 
    deleteProprietaire,
    deleteUtilisateur,
    getAutorisations,
    saveAutorisation,
    reactivateUtilisateur,
    getProprietaireBiens,
    
    // Alias English -> French (Ce que les nouveaux composants utilisent)
    getUsers: getUtilisateurs,
    createUser: saveUtilisateur,
    deleteUser: deleteUtilisateur,
    createOwner: saveProprietaire,
    updateOwner: (id: number, data: any) => saveProprietaire({ ...data, id }), // Helper alias
    
    // Profile
    getProfile,
    updateProfile,

    // Permissions Matrix
    getPermissionsMatrix: async () => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/permissions/matrix`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement permissions');
        return await res.json();
    },
    updatePermission: async (data: { role: string, module: string, can_read: boolean, can_write: boolean, can_delete: boolean, can_validate: boolean }) => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/permissions/matrix`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur mise à jour permissions');
        return await res.json();
    },

    // User-Owner Assignments (Affectation)
    getUserAssignments: async (userId: number) => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/user-assignments/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement affectations');
        return await res.json();
    },
    assignUserToOwner: async (userId: number, ownerId: number, notes?: string) => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/user-assignments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, owner_id: ownerId, notes })
        });
        if (!res.ok) throw new Error('Erreur création affectation');
        return await res.json();
    },
    removeAssignment: async (assignmentId: number) => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/user-assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur suppression affectation');
        return await res.json();
    },
    bulkUpdateAssignments: async (userId: number, ownerIds: number[]) => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        const res = await fetch(`${API_URL}/user-assignments/bulk/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_ids: ownerIds })
        });
        if (!res.ok) throw new Error('Erreur mise à jour affectations');
        return await res.json();
    }
};