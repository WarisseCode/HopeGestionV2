// frontend/src/api/financeApi.ts
import { getToken } from './authApi';

import { API_URL } from '../config';

// --- Interfaces ---

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
    reference_bail: string;
    locataire_nom: string;
    locataire_prenoms: string;
    proprietaire_nom: string;
}

export interface Expense {
    id: number;
    building_id?: number;
    lot_id?: number;
    owner_id?: number;
    category: string;
    description?: string;
    amount: number;
    date_expense: string;
    supplier_name?: string;
    status: string;
    proof_url?: string;
    created_at: string;
    building_name?: string;
    ref_lot?: string;
    category_label?: string;
}

export interface Loan {
    id: number;
    name: string;
    amount: string; // numeric from PG comes as string often
    interest_rate: string;
    duration_months: number;
    start_date: string;
    end_date: string;
    monthly_payment: string;
    status: 'active' | 'paid' | 'cancelled';
    owner_name?: string;
    paid_installments?: number;
    capital_repaid?: number;
    schedule?: LoanSchedule[];
}

export interface LoanSchedule {
    id: number;
    loan_id: number;
    due_date: string;
    amount_total: string;
    amount_principal: string;
    amount_interest: string;
    status: 'pending' | 'paid' | 'late';
    payment_date?: string;
}

export interface TaxSettings {
    owner_id: number;
    fiscal_regime: string;
    tax_rate: number;
    vat_subject: boolean;
    country: string;
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

export interface BaseStats {
    encashed_month: number;
    pending_total: number;
}

// --- API Client ---

export const financeApi = {
    // --- PAYMENTS ---
    getPayments: async (filters?: { lease_id?: number; start_date?: string; end_date?: string; statut?: string; type?: string; }): Promise<Payment[]> => {
        const token = getToken();
        let url = `${API_URL}/finances`;
        const params = new URLSearchParams();
        if (filters?.lease_id) params.append('lease_id', filters.lease_id.toString());
        if (filters?.start_date) params.append('start_date', filters.start_date);
        if (filters?.end_date) params.append('end_date', filters.end_date);
        if (filters?.statut) params.append('statut', filters.statut);
        if (filters?.type) params.append('type', filters.type);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur chargement paiements');
        const data = await res.json();
        return data.payments;
    },

    createPayment: async (data: CreatePaymentData): Promise<Payment> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/finances`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur enregistrement');
        return await res.json();
    },

    getStats: async (): Promise<BaseStats> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/finances/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur stats');
        return await res.json();
    },

    // --- EXPENSES ---
    getExpenses: async (filters?: { building_id?: number; owner_id?: number; start_date?: string; end_date?: string }): Promise<Expense[]> => {
        const token = getToken();
        let url = `${API_URL}/expenses`;
        const params = new URLSearchParams();
        if (filters?.building_id) params.append('building_id', filters.building_id.toString());
        if (filters?.owner_id) params.append('owner_id', filters.owner_id.toString());
        if (filters?.start_date) params.append('start_date', filters.start_date);
        if (filters?.end_date) params.append('end_date', filters.end_date);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur dépenses');
        return await res.json();
    },

    getExpenseCategories: async (): Promise<{id:number, name:string}[]> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/expenses/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.ok ? await res.json() : [];
    },

    createExpense: async (data: Partial<Expense>): Promise<Expense> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur enregistrement dépense');
        return await res.json();
    },

    deleteExpense: async (id: number): Promise<void> => {
        const token = getToken();
        await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },

    // --- LOANS ---
    getLoans: async (ownerId?: number): Promise<Loan[]> => {
        const token = getToken();
        const url = ownerId ? `${API_URL}/loans?owner_id=${ownerId}` : `${API_URL}/loans`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur prêts');
        return await res.json();
    },

    getLoanDetails: async (id: number): Promise<Loan> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/loans/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Prêt introuvable');
        return await res.json();
    },

    createLoan: async (data: any): Promise<Loan> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/loans`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur création prêt');
        return await res.json();
    },

    // --- TAX ---
    getTaxSettings: async (ownerId: number): Promise<TaxSettings> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/settings/${ownerId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        return await res.json();
    },

    saveTaxSettings: async (data: TaxSettings): Promise<TaxSettings> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/settings`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    getTaxReport: async (ownerId: number, year: number): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/report/${ownerId}/${year}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur rapport fiscal');
        return await res.json();
    }
};

export default financeApi;