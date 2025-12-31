// backend/routes/mobileMoneyRoutes.ts
import express from 'express';
import { pool } from '../index';
import { mobileMoneyService, Operator } from '../services/mobileMoneyService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// POST /api/mobile-money/pay - Initier un paiement
router.post('/pay', async (req: AuthenticatedRequest, res) => {
    const { amount, phoneNumber, operator, leaseId, description } = req.body;

    if (!amount || !phoneNumber || !operator) {
        return res.status(400).json({ message: "Données manquantes" });
    }

    try {
        // 1. Créer la transaction en BDD (Status pending)
        const txResult = await pool.query(
            `INSERT INTO mobile_money_transactions 
            (amount, phone_number, operator, status, transaction_type, external_reference)
            VALUES ($1, $2, $3, 'pending', 'collection', $4)
            RETURNING id, transaction_id`,
            [amount, phoneNumber, operator, description]
        );
        const internalId = txResult.rows[0].id;

        // 2. Appeler le service MoMo
        const response = await mobileMoneyService.requestPayment({
            amount,
            phoneNumber,
            operator: operator as Operator
        });

        // 3. Mettre à jour la transaction avec le résultat
        await pool.query(
            `UPDATE mobile_money_transactions 
            SET status = $1, transaction_id = $2, metadata = $3 
            WHERE id = $4`,
            [response.status, response.transactionId, JSON.stringify(response), internalId]
        );

        // 4. Si paiement lié à un bail (Loyer) et Succès -> Créer aussi l'entrée dans 'payments'
        if (response.status === 'success' && leaseId) {
             // Récupérer owner_id du bail
             const leaseRes = await pool.query('SELECT owner_id FROM leases WHERE id = $1', [leaseId]);
             let ownerId = null;
             if (leaseRes.rows.length > 0) ownerId = leaseRes.rows[0].owner_id;

             const payResult = await pool.query(
                 `INSERT INTO payments 
                 (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, statut, owner_id)
                 VALUES ($1, $2, 'Loyer', $3, CURRENT_DATE, $4, 'valide', $5)
                 RETURNING id`,
                 [leaseId, amount, operator, response.transactionId, ownerId]
             );
             
             // Lier transaction technique au paiement métier
             await pool.query('UPDATE mobile_money_transactions SET payment_id = $1 WHERE id = $2', [payResult.rows[0].id, internalId]);
        }

        res.json({
            success: response.success,
            message: response.message,
            transactionId: response.transactionId,
            status: response.status
        });

    } catch (error) {
        console.error('Erreur paiement Mobile Money:', error);
        res.status(500).json({ message: "Erreur serveur lors du paiement" });
    }
});

// GET /api/mobile-money/transactions - Historique
router.get('/transactions', async (req: AuthenticatedRequest, res) => {
    try {
        const result = await pool.query('SELECT * FROM mobile_money_transactions ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique MoMo:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

export default router;
