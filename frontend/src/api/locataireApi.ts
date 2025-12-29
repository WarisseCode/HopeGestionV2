// frontend/src/api/locataireApi.ts
import { getToken } from './authApi';

export interface Locataire {
    id: number;
    nom: string;
    prenoms: string;
    email?: string;
    telephone_principal: string;
    telephone_secondaire?: string;
    nationalite?: string;
    type_piece?: string;
    numero_piece?: string;
    photo_piece_url?: string;
    photo_profil_url?: string;
    type: 'Locataire' | 'Acheteur' | 'Prospect';
    statut: 'Actif' | 'Inactif' | 'Expiré' | 'Archivé';
    mode_paiement_preferentiel?: string;
    active_leases?: number; // count from SQL
    created_at?: string;
}

export interface LocataireDetails {
    locataire: Locataire;
    baux: any[]; // On pourra affiner le type Bail plus tard
    paiements: any[];
}

import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/locataires`;

export async function getLocataires(type?: string, search?: string): Promise<Locataire[]> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur lors du chargement des locataires');
    const data = await response.json();
    return data.locataires || [];
}

export async function getLocataireDetails(id: number): Promise<LocataireDetails> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur détails locataire');
    return await response.json();
}

export async function createLocataire(data: Partial<Locataire>): Promise<number> {
    const token = getToken();
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Erreur création locataire');
    const resData = await response.json();
    return resData.id;
}

export async function updateLocataire(id: number, data: Partial<Locataire>): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Erreur modification locataire');
}

export async function deleteLocataire(id: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur suppression locataire');
}
