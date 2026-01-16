// frontend/src/api/financeApi.ts
import { getToken } from './authApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Payment {
    id: number;
    lease_id: number;
    schedule_id?: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    type: string;
    statut: string;
    description?: string;
    created_at: string;
    // Joined fields
    reference_bail: string;
    locataire_nom: string;
    locataire_prenoms: string;
    proprietaire_nom: string;
}

export interface CreatePaymentData {
    lease_id: number;
    schedule_id?: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    type: string;
    description?: string;
}

export interface FinanceStats {
    encashed_month: number;
    pending_total: number;
}

// Legacy interfaces mapping (to avoid breaking Finances.tsx immediately if not updated)
export type Paiement = Payment;
export interface Depense { id: number; amount: number; description: string; date: string; } // Placeholder

export const financeApi = {
    // Get payments list
    getPayments: async (filters?: { 
        lease_id?: number; 
        start_date?: string; 
        end_date?: string;
        statut?: string;
        type?: string;
    }): Promise<Payment[]> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        let url = `${API_URL}/finances`;
        const params = new URLSearchParams();
        if (filters?.lease_id) params.append('lease_id', filters.lease_id.toString());
        if (filters?.start_date) params.append('start_date', filters.start_date);
        if (filters?.end_date) params.append('end_date', filters.end_date);
        if (filters?.statut) params.append('statut', filters.statut);
        if (filters?.type) params.append('type', filters.type);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement paiements');
        const data = await res.json();
        return data.payments;
    },

    // Record new payment
    createPayment: async (data: CreatePaymentData): Promise<Payment> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/finances`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erreur enregistrement paiement');
        }
        return await res.json();
    },

    // Get finance stats
    getStats: async (): Promise<FinanceStats> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/finances/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement statistiques');
        return await res.json();
    },

    // Get receipt data
    getReceipt: async (id: number): Promise<any> => {
        const token = getToken();
        if (!token) throw new Error('Non authentifié');
        
        const res = await fetch(`${API_URL}/finances/receipt/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur chargement quittance');
        const data = await res.json();
        return data.receipt;
    }
};

export default financeApi;