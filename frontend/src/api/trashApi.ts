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

    purge: async (module: string, id: number): Promise<void> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/trash/${module}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur de suppression définitive');
    },
};

export default trashApi;
