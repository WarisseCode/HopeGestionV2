import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/delegations`;

export interface Permissions {
  can_view_finances: boolean;
  can_edit_properties: boolean;
  can_manage_tenants: boolean;
}

export interface TeamMember {
  id: number;
  nom: string;
  email: string;
  role: string;
  start_date: string;
  is_active: boolean;
  can_view_finances: boolean;
  can_edit_properties: boolean;
  can_manage_tenants: boolean;
}

// Récupérer mon équipe
export async function getTeam(): Promise<TeamMember[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(API_URL, {
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
  return data.team || [];
}

// Ajouter un membre
export async function addTeamMember(email: string, role: string, permissions: Permissions): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role, permissions }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.status}`);
  }
}

// Retirer un membre
export async function removeTeamMember(targetId: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/${targetId}`, {
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
