// frontend/src/api/templateApi.ts
import { getToken } from './authApi';

import { API_URL } from '../config';

export interface DocumentTemplate {
    id: number;
    name: string;
    type: string;
    content: string;
    is_default: boolean;
    created_at: string;
}

export const templateApi = {
    // List
    getTemplates: async (): Promise<DocumentTemplate[]> => {
        const token = getToken();
        if (!token) throw new Error("Non authentifié");
        const res = await fetch(`${API_URL}/templates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur chargement modèles");
        return await res.json();
    },

    // Detail
    getTemplate: async (id: number): Promise<DocumentTemplate> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/templates/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur chargement modèle");
        return await res.json();
    },

    // Create
    createTemplate: async (data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/templates`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Erreur création modèle");
        return await res.json();
    },

    // Update
    updateTemplate: async (id: number, data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/templates/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Erreur mise à jour");
        return await res.json();
    },

    // Delete
    deleteTemplate: async (id: number): Promise<void> => {
        const token = getToken();
        await fetch(`${API_URL}/templates/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },

    // Get Variables
    getVariables: async (type: string): Promise<string[]> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/templates/variables/${type}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok ? await res.json() : [];
    }
};
