// frontend/src/api/mobileMoneyApi.ts
import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/mobile-money`;

export interface MobileMoneyTransaction {
  id: number;
  amount: number;
  phone_number: string;
  operator: 'MTN' | 'MOOV' | 'CELTIPAY' | 'KKIAPAY' | 'FEDAPAY';
  status: 'pending' | 'success' | 'failed';
  transaction_type: string;
  external_reference?: string;
  transaction_id?: string;
  created_at: string;
}

export interface PaymentRequest {
    amount: number;
    phoneNumber: string;
    operator: string;
    description?: string;
    leaseId?: number;
}

export interface PaymentResponse {
    success: boolean;
    message: string;
    transactionId: string;
    status: string;
}

export async function initierPaiement(data: PaymentRequest): Promise<PaymentResponse> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/pay`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur paiement');
    }

    return await response.json();
}

export async function getTransactionsMoMo(): Promise<MobileMoneyTransaction[]> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur chargement transactions');

    return await response.json();
}
