// frontend/src/api/rentPaymentApi.ts
// API client for online rent payments

import { getToken } from './authApi';
import { API_URL } from '../config';

export interface PaymentSchedule {
    id: number;
    lease_id: number;
    tenant_id: number;
    total_amount: number;
    amount_paid: number;
    due_date: string;
    status: string;
    description: string;
    pending_transaction_id?: number | null;
}

export interface VerifyPaymentResult {
    success: boolean;
    status: string;
    message: string;
}

export interface RentPaymentTransaction {
    id: number;
    amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    paid_at: string | null;
    description: string;
    due_date: string;
}

export interface CreatePaymentLinkResponse {
    success: boolean;
    message: string;
    transactionId: number | null;
    paymentUrl: string | null;
    fedapayTransactionId: string | null;
}

class RentPaymentApi {
    /**
     * Get pending payment schedules for the logged-in tenant
     */
    async getMyPendingSchedules(): Promise<PaymentSchedule[]> {
        const token = getToken();
        // Use the new endpoint that resolves tenant from user token
        const res = await fetch(`${API_URL}/rent-payments/my-pending`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erreur lors de la récupération de vos loyers');
        }

        const data = await res.json();
        // The endpoint returns the array directly
        return data as PaymentSchedule[];
    }

    /**
     * Get pending payment schedules for a lease (Manager/Admin use)
     */
    async getPendingSchedules(leaseId: number): Promise<PaymentSchedule[]> {
        const token = getToken();
        const res = await fetch(`${API_URL}/rent-payments/${leaseId}/pending`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erreur lors de la récupération des échéances');
        }

        const data = await res.json();
        return data.schedules;
    }

    /**
     * Create a payment link for a rent payment schedule
     */
    async initiatePayment(scheduleId: number, operator: 'mtn' | 'moov'): Promise<CreatePaymentLinkResponse> {
        const token = getToken();
        const res = await fetch(`${API_URL}/rent-payments/initiate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scheduleId, operator })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erreur lors de la création du lien de paiement');
        }

        const data = await res.json();
        return data;
    }

    /**
     * Manually verify a transaction status
     */
    async verifyPayment(transactionId: number): Promise<VerifyPaymentResult> {
        const token = getToken();
        const res = await fetch(`${API_URL}/rent-payments/verify/${transactionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erreur lors de la vérification du paiement');
        }

        return await res.json();
    }

    /**
     * Get payment transaction history for the authenticated tenant
     */
    async getTransactionHistory(limit: number = 20): Promise<RentPaymentTransaction[]> {
        const token = getToken();
        const res = await fetch(`${API_URL}/rent-payments/history?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Erreur lors de la récupération de l\'historique');
        }

        const data = await res.json();
        return data.transactions;
    }
}

export const rentPaymentApi = new RentPaymentApi();
