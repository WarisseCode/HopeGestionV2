// frontend/src/api/locationApi.ts
// API client for locations/baux management

import { getToken } from './authApi';

import { API_URL } from '../config';
export type { Location, PaymentScheduleItem, CreateLocationData } from '@hopegestion/shared-types';

export const locationApi = {
    // Get all locations
    getLocations: async (filters?: { statut?: string; owner_id?: number }): Promise<Location[]> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        let url = `${API_URL}/locations`;
        const params = new URLSearchParams();
        if (filters?.statut) params.append('statut', filters.statut);
        if (filters?.owner_id) params.append('owner_id', filters.owner_id.toString());
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement locations');
        const data = await res.json();
        return data.locations;
    },

    // Get single location details
    getLocation: async (id: number): Promise<{ location: Location; echeancier: PaymentScheduleItem[] }> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement location');
        return await res.json();
    },

    // Create new location
    createLocation: async (data: CreateLocationData): Promise<Location> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        console.log('Sending payload to API:', JSON.stringify(data, null, 2));

        const res = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            console.error('API Error Response:', err);
            throw new Error(err.message || 'Erreur création location');
        }
        return await res.json();
    },

    // Update location
    updateLocation: async (id: number, data: Partial<Location>): Promise<Location> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur modification location');
        return await res.json();
    },

    // Terminate location
    resilierLocation: async (id: number, motif?: string): Promise<void> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}/resilier`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motif, date_resiliation: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('Erreur résiliation');
    },

    // Renew location
    renouvelerLocation: async (id: number, nouvelle_date_fin: string, nouveau_loyer?: number): Promise<Location> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}/renouveler`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nouvelle_date_fin, nouveau_loyer })
        });
        if (!res.ok) throw new Error('Erreur renouvellement');
        const data = await res.json();
        return data.location;
    },

    // Get payment schedule
    getEcheancier: async (id: number): Promise<PaymentScheduleItem[]> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}/echeancier`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement échéancier');
        const data = await res.json();
        return data.echeancier;
    },
    // Sign lease
    signLease: async (id: number, signature_image: string): Promise<void> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/locations/${id}/sign`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ signatureImage: signature_image })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erreur lors de la signature');
        }
    }
};

export default locationApi;
