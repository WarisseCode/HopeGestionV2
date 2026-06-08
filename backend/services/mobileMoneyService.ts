// backend/services/mobileMoneyService.ts
// ⚠️ RÈGLE ARCHITECTURE : Ce service reçoit dbClient en paramètre.
// Ne jamais importer pool directement ici — cela contournerait le RLS.
import { PoolClient } from 'pg';

export type Operator = 'MTN' | 'MOOV' | 'CELTIPAY' | 'KKIAPAY' | 'FEDAPAY';

export interface MobileMoneyConfig {
    id: number;
    user_id: number;
    nom: string;
    operateur: Operator;
    numero: string;
    statut: 'actif' | 'inactif';
    created_at: Date;
}

export interface CreateConfigDto {
    userId: number;
    nom: string;
    operateur: Operator;
    numero: string;
}

interface PaymentRequest {
    amount: number;
    phoneNumber: string;
    operator: Operator;
    description?: string;
    transactionId?: string; // ID transaction interne
}

interface PaymentResponse {
    success: boolean;
    message: string;
    transactionId: string; // ID opérateur
    status: 'pending' | 'success' | 'failed';
}

class MobileMoneyService {

    // --- CONFIGURATION MANAGEMENT ---

    async getConfigs(dbClient: PoolClient, userId: number): Promise<MobileMoneyConfig[]> {
        const res = await dbClient.query(
            "SELECT * FROM mobile_money_configs WHERE user_id = $1 ORDER BY created_at DESC", 
            [userId]
        );
        return res.rows;
    }

    async addConfig(dbClient: PoolClient, data: CreateConfigDto): Promise<MobileMoneyConfig> {
        const res = await dbClient.query(
            // Injection de la contrainte RLS (owner_id) via le contexte global sans rompre l'API de base
            "INSERT INTO mobile_money_configs (user_id, nom, operateur, numero, owner_id) VALUES ($1, $2, $3, $4, current_setting('app.current_owner_id', true)::int) RETURNING *",
            [data.userId, data.nom, data.operateur, data.numero]
        );
        return res.rows[0];
    }

    async updateConfig(dbClient: PoolClient, id: number, userId: number, data: Partial<CreateConfigDto>): Promise<MobileMoneyConfig> {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.nom) { fields.push(`nom = $${idx++}`); values.push(data.nom); }
        if (data.operateur) { fields.push(`operateur = $${idx++}`); values.push(data.operateur); }
        if (data.numero) { fields.push(`numero = $${idx++}`); values.push(data.numero); }

        if (fields.length === 0) throw new Error("Aucune donnée à modifier");

        values.push(id);
        values.push(userId);

        const idIdx = idx;
        const res = await dbClient.query(
            `UPDATE mobile_money_configs SET ${fields.join(', ')} WHERE id = $${idIdx} AND user_id = $${idIdx + 1} RETURNING *`,
            values
        );
        
        if (res.rows.length === 0) throw new Error("Configuration introuvable ou accès refusé.");
        return res.rows[0];
    }

    async deleteConfig(dbClient: PoolClient, id: number, userId: number): Promise<void> {
        const res = await dbClient.query("DELETE FROM mobile_money_configs WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
        if (res.rowCount === 0) throw new Error("Configuration introuvable ou accès refusé.");
    }

    async toggleConfigStatus(dbClient: PoolClient, id: number, userId: number): Promise<MobileMoneyConfig> {
        const res = await dbClient.query(
            `UPDATE mobile_money_configs 
             SET statut = CASE WHEN statut = 'actif' THEN 'inactif' ELSE 'actif' END 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [id, userId]
        );
        if (res.rows.length === 0) throw new Error("Configuration introuvable ou accès refusé.");
        return res.rows[0];
    }
    
    // --- PAYMENT SIMULATION ---

    // Simuler une demande de paiement (Collection)
    async requestPayment(data: PaymentRequest): Promise<PaymentResponse> {
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
    async checkStatus(transactionId: string): Promise<string> {
        // En prod, on appellerait l'API de l'opérateur
        return 'success';
    }
}

export const mobileMoneyService = new MobileMoneyService();
