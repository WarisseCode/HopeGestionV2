/**
 * @hopegestion/api-client — Finance API
 * Compatible web + mobile
 */
import { apiCall } from './core';
import type { Payment, Expense } from '@hopegestion/shared-types';

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
  expenses_month: number;
  net_balance: number;
  pending_total: number;
}

export const financeApi = {
  getPayments: async (filters?: {
    lease_id?: number;
    start_date?: string;
    end_date?: string;
    statut?: string;
    type?: string;
  }): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (filters?.lease_id) params.append('lease_id', String(filters.lease_id));
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiCall<{ payments: Payment[] }>(`/finances${query}`);
    return data.payments;
  },

  createPayment: async (data: CreatePaymentData): Promise<Payment> => {
    return apiCall<Payment>('/finances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStats: async (period?: string): Promise<FinanceStats> => {
    const query = period ? `?period=${period}` : '';
    return apiCall<FinanceStats>(`/finances/stats${query}`);
  },

  getExpenses: async (filters?: { building_id?: number; start_date?: string; end_date?: string }): Promise<Expense[]> => {
    const params = new URLSearchParams();
    if (filters?.building_id) params.append('building_id', String(filters.building_id));
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiCall<{ expenses: Expense[] }>(`/expenses${query}`);
    return data.expenses;
  },

  createExpense: async (data: Partial<Expense>): Promise<Expense> => {
    return apiCall<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
