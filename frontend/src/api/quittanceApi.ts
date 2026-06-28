// frontend/src/api/quittanceApi.ts
// API des quittances générées manuellement (persistées côté backend).
import { getToken } from './authApi';
import { API_URL } from '../config';

export interface ManualQuittance {
    id: number;
    numero: string;
    lease_id?: number;
    locataire_name: string;
    proprietaire_name?: string;
    proprietaire_adresse?: string;
    proprietaire_tel?: string;
    bien: string;
    periode: string;
    montant: number;
    date_emission: string;
    created_at: string;
}

export interface CreateManualQuittanceData {
    lease_id: number;
    locataire: string;
    bien: string;
    periode: string;
    montant: number;
    date_emission: string;
}

export const quittanceApi = {
    list: async (): Promise<ManualQuittance[]> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/quittances`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur chargement des quittances manuelles');
        return await res.json();
    },

    create: async (data: CreateManualQuittanceData): Promise<ManualQuittance> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/quittances`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur enregistrement de la quittance');
        return await res.json();
    },
};

export default quittanceApi;
