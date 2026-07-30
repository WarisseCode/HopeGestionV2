// frontend/src/api/trashApi.ts
// API du module Corbeille (soft-delete / restauration / suppression définitive).
import { getToken } from './authApi';
import { API_URL } from '../config';

export interface TrashItem {
    module: string;
    module_label: string;
    type_label: string;
    id: number;
    label: string;
    deleted_at: string;
    deleted_by: number | null;
    deleted_by_name: string;
}

export interface TrashFilters {
    module?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

// Une ligne de l'impact d'une suppression définitive : « Paiements : 17 ».
export interface TrashImpact {
    table: string;
    label: string;
    count: number;
}

// Levée quand le serveur refuse une purge non confirmée (409) : porte l'impact
// chiffré pour que l'appelant puisse le présenter avant de relancer avec force.
export class PurgeConfirmationRequired extends Error {
    // Champ déclaré explicitement : les propriétés de paramètre de constructeur
    // sont interdites par `erasableSyntaxOnly` (tsconfig).
    impact: TrashImpact[];

    constructor(message: string, impact: TrashImpact[]) {
        super(message);
        this.name = 'PurgeConfirmationRequired';
        this.impact = impact;
    }
}

export const trashApi = {
    list: async (filters: TrashFilters = {}): Promise<TrashItem[]> => {
        const token = getToken();
        const p = new URLSearchParams();
        if (filters.module) p.set('module', filters.module);
        if (filters.search) p.set('search', filters.search);
        if (filters.startDate) p.set('startDate', filters.startDate);
        if (filters.endDate) p.set('endDate', filters.endDate);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await fetch(`${API_URL}/trash${qs}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur chargement de la corbeille');
        return await res.json();
    },

    restore: async (module: string, id: number): Promise<void> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/trash/${module}/${id}/restore`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur de restauration');
    },

    // Ce qu'une suppression définitive détruirait, sans rien supprimer.
    impact: async (module: string, id: number): Promise<TrashImpact[]> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/trash/${module}/${id}/impact`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Impossible d'évaluer l'impact de la suppression");
        return (await res.json()).impact || [];
    },

    // `force` = l'utilisateur a vu et accepté l'impact en cascade. Sans lui, le serveur
    // renvoie 409 sans rien détruire dès qu'il existe des données rattachées.
    purge: async (module: string, id: number, force = false): Promise<void> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/trash/${module}/${id}${force ? '?force=true' : ''}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) return;
        const body = await res.json().catch(() => ({}));
        if (res.status === 409 && body.requiresConfirmation) {
            throw new PurgeConfirmationRequired(body.message || 'Confirmation requise', body.impact || []);
        }
        throw new Error(body.message || 'Erreur de suppression définitive');
    },
};

export default trashApi;
