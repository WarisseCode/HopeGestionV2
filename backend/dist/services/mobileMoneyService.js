"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileMoneyService = void 0;
class MobileMoneyService {
    // Simuler une demande de paiement (Collection)
    async requestPayment(data) {
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
    async checkStatus(transactionId) {
        // En prod, on appellerait l'API de l'opérateur
        return 'success';
    }
}
exports.mobileMoneyService = new MobileMoneyService();
//# sourceMappingURL=mobileMoneyService.js.map