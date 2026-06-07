// frontend/src/api/financeApi.ts
import { getToken } from './authApi';

import { API_URL } from '../config';

export type { Payment, Expense, Loan, LoanSchedule } from '@hopegestion/shared-types';

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

    getStats: async (month?: number, year?: number): Promise<BaseStats> => {
        const token = getToken();
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_URL}/finances/stats${qs}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur stats');
        return await res.json();
    },

    getMonthlyStats: async (months: number = 6): Promise<any[]> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/finances/stats/monthly?months=${months}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur stats mensuelles');
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

    createExpense: async (data: Partial<Expense>, proofFile?: File): Promise<Expense> => {
        const token = getToken();
        
        if (proofFile) {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('proof', proofFile);
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                }
            });
            const res = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Erreur enregistrement dépense');
            return await res.json();
        } else {
            const res = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Erreur enregistrement dépense');
            return await res.json();
        }
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

    closeLoan: async (id: number): Promise<{ message: string }> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/loans/${id}/close`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur clôture');
        return await res.json();
    },

    payInstallment: async (loanId: number, paymentId: number): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/loans/${loanId}/installment/${paymentId}/pay`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur paiement');
        return await res.json();
    },

    // --- TAX ---
    // [SÉCURITÉ] ownerId retiré de l'URL — le backend résout le tenant via JWT+tenantGuard
    getTaxSettings: async (): Promise<TaxSettings> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/settings`, { headers: { 'Authorization': `Bearer ${token}` } });
        return await res.json();
    },

    saveTaxSettings: async (data: Omit<TaxSettings, 'owner_id'>): Promise<TaxSettings> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/settings`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // [SÉCURITÉ] ownerId retiré de l'URL — le backend résout le tenant via JWT+tenantGuard
    getTaxReport: async (year: number): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/tax/report/${year}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erreur rapport fiscal');
        return await res.json();
    },
    // --- SCHEDULES ---
    generateSchedules: async (month?: number, year?: number): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/finances/generate-schedules`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, year })
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur génération échéances');
        return await res.json();
    },

    getSchedules: async (month?: number, year?: number): Promise<any[]> => {
        const token = getToken();
        const params = new URLSearchParams();
        if (month) params.set('month', month.toString());
        if (year) params.set('year', year.toString());
        const res = await fetch(`${API_URL}/finances/schedules?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur chargement échéances');
        return await res.json();
    },

    paySchedule: async (scheduleId: number, paymentMethod?: string, reference?: string): Promise<any> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/finances/schedules/${scheduleId}/pay`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_method: paymentMethod, reference })
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur paiement échéance');
        return await res.json();
    },

    // --- ONLINE PAYMENTS (Admin/Gestionnaire) ---

    getOnlineTransactions: async (month?: number, year?: number, status?: string): Promise<any[]> => {
        const token = getToken();
        let url = `${API_URL}/rent-payments/admin/transactions?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`;
        if (status) url += `&status=${status}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur chargement transactions');
        const data = await res.json();
        return data.transactions;
    },

    getOnlinePaymentStats: async (month?: number, year?: number): Promise<any> => {
        const token = getToken();
        const url = `${API_URL}/rent-payments/admin/stats?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erreur chargement stats');
        const data = await res.json();
        return data.stats;
    }
};

export default financeApi;
