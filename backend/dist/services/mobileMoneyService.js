"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileMoneyService = void 0;
// backend/services/mobileMoneyService.ts
const database_1 = __importDefault(require("../db/database")); // Fix import path if needed, usually pool is in db/database or index
class MobileMoneyService {
    // --- CONFIGURATION MANAGEMENT ---
    async getConfigs(userId) {
        const res = await database_1.default.query("SELECT * FROM mobile_money_configs WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        return res.rows;
    }
    async addConfig(data) {
        const res = await database_1.default.query("INSERT INTO mobile_money_configs (user_id, nom, operateur, numero) VALUES ($1, $2, $3, $4) RETURNING *", [data.userId, data.nom, data.operateur, data.numero]);
        return res.rows[0];
    }
    async updateConfig(id, userId, data) {
        const fields = [];
        const values = [];
        let idx = 1;
        if (data.nom) {
            fields.push(`nom = $${idx++}`);
            values.push(data.nom);
        }
        if (data.operateur) {
            fields.push(`operateur = $${idx++}`);
            values.push(data.operateur);
        }
        if (data.numero) {
            fields.push(`numero = $${idx++}`);
            values.push(data.numero);
        }
        if (fields.length === 0)
            throw new Error("Aucune donnée à modifier");
        values.push(id);
        values.push(userId);
        const res = await database_1.default.query(`UPDATE mobile_money_configs SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`, values);
        if (res.rows.length === 0)
            throw new Error("Configuration introuvable");
        return res.rows[0];
    }
    async deleteConfig(id, userId) {
        await database_1.default.query("DELETE FROM mobile_money_configs WHERE id = $1 AND user_id = $2", [id, userId]);
    }
    async toggleConfigStatus(id, userId) {
        const res = await database_1.default.query(`UPDATE mobile_money_configs 
             SET statut = CASE WHEN statut = 'actif' THEN 'inactif' ELSE 'actif' END 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`, [id, userId]);
        if (res.rows.length === 0)
            throw new Error("Configuration introuvable");
        return res.rows[0];
    }
    // --- PAYMENT SIMULATION ---
    // Simuler une demande de paiement (Collection)
    async requestPayment(data) {
        console.log(`[MoMo Sandbox] Demande paiement ${data.amount} FCFA sur ${data.phoneNumber} (${data.operator})`);
        // Simulation d'un délai réseau
        await new Promise(resolve => setTimeout(resolve, 1500));
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
