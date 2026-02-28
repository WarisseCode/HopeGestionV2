// frontend/src/api/locataireApi.ts
import { API_URL as BASE_URL } from '../config';
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
    invitation_code?: string;
    type: 'Locataire' | 'Acheteur' | 'Prospect';
    statut: 'Actif' | 'Inactif' | 'Expiré' | 'Archivé' | 'En attente' | 'Rejeté';
    mode_paiement_preferentiel?: string;
    active_leases?: number; // count from SQL
    created_at?: string;
    // Module IV new fields
    adresse_actuelle?: string;
    date_expiration_piece?: string;
    caution?: number;
    avance?: number;
    paiement_echelonne?: boolean;
    // Display fields from LATERAL JOIN
    lot_nom?: string;      // Active lot reference
    loyer_actuel?: number; // Active rent amount
    active_lease_id?: number;
    bail_statut?: string;
    // Legacy aliases (for backward compatibility)
    lot?: string;
    loyer?: number;
    paiementEcheance?: boolean;
}

export interface LocataireDetails {
    locataire: Locataire;
    baux: any[]; // On pourra affiner le type Bail plus tard
    paiements: any[];
}

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

    if (!response.ok) {
        let errMsg = 'Erreur lors du chargement des locataires';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
    const data = await response.json();
    return data.locataires || [];
}

export async function getLocataireDetails(id: number): Promise<LocataireDetails> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        let errMsg = 'Erreur détails locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
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

    if (!response.ok) {
        let errMsg = 'Erreur création locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
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

    if (!response.ok) {
        let errMsg = 'Erreur modification locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
}

export async function deleteLocataire(id: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        let errMsg = 'Erreur suppression locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
}

export async function approveLocataire(id: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        let errMsg = 'Erreur approbation locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
}

export async function rejectLocataire(id: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        let errMsg = 'Erreur rejet locataire';
        try { const errData = await response.json(); if (errData.message) errMsg = errData.message; } catch (e) {}
        throw new Error(errMsg);
    }
}
