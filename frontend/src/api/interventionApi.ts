// frontend/src/api/interventionApi.ts
import { API_URL } from '../config';
import { getToken } from './authApi';

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const interventionApi = {
    // Tickets
    getTickets: async (filters: Record<string, any> = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> => {
        const query = new URLSearchParams(filters as any).toString();
        const res = await fetch(`${API_URL}/tickets?${query}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Erreur chargement tickets');
        return res.json();
    },
    createTicket: async (data: any) => {
        const res = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur création ticket');
        return res.json();
    },
    updateTicket: async (id: number, data: any) => {
        const res = await fetch(`${API_URL}/tickets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur mise à jour ticket');
        return res.json();
    },
    closeTicket: async (id: number, data: any) => {
         const res = await fetch(`${API_URL}/tickets/${id}/close`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur clôture ticket');
        return res.json();
    },

    // Providers
    getProviders: async (filters: Record<string, any> = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> => {
        const query = new URLSearchParams(filters as any).toString();
        const res = await fetch(`${API_URL}/providers?${query}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Erreur chargement prestataires');
        return res.json();
    },
    createProvider: async (data: any) => {
        const res = await fetch(`${API_URL}/providers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur création prestataire');
        return res.json();
    },
    updateProvider: async (id: number, data: any) => {
        const res = await fetch(`${API_URL}/providers/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur mise à jour prestataire');
        return res.json();
    },
    deleteProvider: async (id: number) => {
        const res = await fetch(`${API_URL}/providers/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Erreur suppression prestataire');
        return res.json();
    }
};
