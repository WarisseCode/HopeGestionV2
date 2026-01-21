// frontend/src/api/subscriptionApi.ts
import { getToken } from './authApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Plan {
    id: number;
    name: string;
    display_name: string;
    price: number;
    duration_months: number;
    max_properties: number;
    max_tenants: number;
    features: string[];
}

export interface SubscriptionStatus {
    subscription_id?: number;
    plan: Plan;
    status: string;
    start_date?: string;
    end_date?: string;
    days_remaining?: number | null;
    is_premium: boolean;
}

export interface SubscribeRequest {
    plan_id: number;
    phone_number: string;
    operator: 'MTN' | 'MOOV' | 'CELTIPAY';
}

export interface SubscribeResponse {
    success: boolean;
    message: string;
    transaction_id?: string;
    plan?: Plan;
    end_date?: string;
}

export interface PaymentHistory {
    id: number;
    plan_name: string;
    display_name: string;
    amount: number;
    operator: string;
    phone_number: string;
    status: string;
    payment_date: string;
}

// Fetch available plans (public)
export const getPlans = async (): Promise<Plan[]> => {
    const response = await fetch(`${API_URL}/subscriptions/plans`);
    if (!response.ok) throw new Error('Erreur chargement des plans');
    return response.json();
};

// Get current user subscription status
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
    
    const response = await fetch(`${API_URL}/subscriptions/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur statut abonnement');
    return response.json();
};

// Subscribe to a plan with Mobile Money
export const subscribe = async (data: SubscribeRequest): Promise<SubscribeResponse> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
    
    const response = await fetch(`${API_URL}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw result;
    return result;
};

// Get payment history
export const getPaymentHistory = async (): Promise<PaymentHistory[]> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
    
    const response = await fetch(`${API_URL}/subscriptions/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur historique');
    return response.json();
};

// Check payment status manually
export const checkPaymentStatus = async (transactionId: string): Promise<any> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
    
    const response = await fetch(`${API_URL}/subscriptions/check-payment/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    return result;
};

export default {
    getPlans,
    getSubscriptionStatus,
    subscribe,
    getPaymentHistory,
    checkPaymentStatus
};
