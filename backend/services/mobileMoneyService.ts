// backend/services/mobileMoneyService.ts
import { pool } from '../index';

export type Operator = 'MTN' | 'MOOV' | 'CELTIPAY' | 'KKIAPAY' | 'FEDAPAY';

interface PaymentRequest {
    amount: number;
    phoneNumber: string;
    operator: Operator;
    transactionId?: string; // ID transaction interne
}

interface PaymentResponse {
    success: boolean;
    message: string;
    transactionId: string; // ID opérateur
    status: 'pending' | 'success' | 'failed';
}

class MobileMoneyService {
    
    // Simuler une demande de paiement (Collection)
    async requestPayment(data: PaymentRequest): Promise<PaymentResponse> {
        console.log(`[MoMo Sandbox] Demande paiement ${data.amount} FCFA sur ${data.phoneNumber} (${data.operator})`);
        
        // Simulation d'un délai réseau
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Logique de simulation : 
        // - Si montant terminant par 000 -> Succès
        // - Si montant terminant par 111 -> Echec
        // - Sinon -> Pending (nécessite validation USSD fictive) -> On va dire Succès pour la démo
        
        const isFailure = data.amount.toString().endsWith('111');
        
        const operatorTxId = `${data.operator}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        if (isFailure) {
            return {
                success: false,
                message: "Solde insuffisant ou timeout",
                transactionId: operatorTxId,
                status: 'failed'
            };
        }

        return {
            success: true,
            message: "Demande de paiement acceptée. En attente validation USSD.",
            transactionId: operatorTxId,
            status: 'success' // Simplification pour la démo: succès direct
        };
    }

    // Vérifier le statut (Polling)
    async checkStatus(transactionId: string): Promise<string> {
        // En prod, on appellerait l'API de l'opérateur
        return 'success';
    }
}

export const mobileMoneyService = new MobileMoneyService();
