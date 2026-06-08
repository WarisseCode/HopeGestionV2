// backend/routes/mobileMoneyRoutes.ts
import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { mobileMoneyService, Operator } from '../services/mobileMoneyService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';

const router = express.Router();

// Paiement MoMo : montant > 0 obligatoire (intégrité financière + appel provider).
const payRules = [
    body('amount').notEmpty().withMessage('Le montant est obligatoire').bail().isFloat({ gt: 0 }).withMessage('Le montant doit être un nombre strictement positif'),
    body('phoneNumber').notEmpty().withMessage('Le numéro de téléphone est obligatoire').bail().isString().isLength({ max: 30 }).withMessage('Numéro invalide'),
    body('operator').notEmpty().withMessage("L'opérateur est obligatoire").bail().isString().isLength({ max: 30 }).withMessage('Opérateur invalide'),
    body('leaseId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('leaseId invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Description trop longue'),
];
const configIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];

// POST /api/mobile-money/pay - Initier un paiement
// Le webhook n'est pas ici, c'est une requête synchrone vers l'API.
router.post('/pay', tenantGuard, validate(payRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const strictOwnerId = (req as any).resolvedOwnerId;

    const { amount, phoneNumber, operator, leaseId, description } = req.body;

    if (!amount || !phoneNumber || !operator) {
        return res.status(400).json({ message: "Données manquantes" });
    }

    try {
        // 1. Créer la transaction en BDD (Status pending)
        const txResult = await dbClient.query(
            `INSERT INTO mobile_money_transactions 
            (amount, phone_number, operator, status, transaction_type, external_reference)
            VALUES ($1, $2, $3, 'pending', 'collection', $4)
            RETURNING id, transaction_id`,
            [amount, phoneNumber, operator, description]
        );
        const internalId = txResult.rows[0].id;

        // 2. Appeler le service MoMo (API externe, pas de dbClient)
        const response = await mobileMoneyService.requestPayment({
            amount,
            phoneNumber,
            operator: operator as Operator
        });

        // 3. Mettre à jour la transaction avec le résultat
        await dbClient.query(
            `UPDATE mobile_money_transactions 
            SET status = $1, transaction_id = $2, metadata = $3 
            WHERE id = $4`,
            [response.status, response.transactionId, JSON.stringify(response), internalId]
        );

        // 4. Si paiement lié à un bail (Loyer) et Succès -> Créer aussi l'entrée dans 'payments'
        if (response.status === 'success' && leaseId) {
             const leaseRes = await dbClient.query('SELECT id FROM leases WHERE id = $1', [leaseId]);
             
             if (leaseRes.rows.length > 0) {
                 const payResult = await dbClient.query(
                     `INSERT INTO payments 
                     (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, statut, owner_id)
                     VALUES ($1, $2, 'Loyer', $3, CURRENT_DATE, $4, 'valide', $5)
                     RETURNING id`,
                     [leaseId, amount, operator, response.transactionId, strictOwnerId]
                 );
                 
                 // Lier transaction technique au paiement métier
                 await dbClient.query('UPDATE mobile_money_transactions SET payment_id = $1 WHERE id = $2', [payResult.rows[0].id, internalId]);
             } else {
                 console.error("Bail non trouvé ou accès refusé (RLS). Le paiement technique a eu lieu mais l'entrée métier 'payments' n'a pas été créée.");
             }
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
router.get('/transactions', tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        const result = await dbClient.query('SELECT * FROM mobile_money_transactions ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique MoMo:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// --- ROUTES CONFIGURATION COMPTES ---

// GET /api/mobile-money/configs
router.get('/configs', tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        if (!req.userId) return res.status(401).json({ message: "Non authentifié" });
        const configs = await mobileMoneyService.getConfigs(dbClient, req.userId);
        res.json(configs);
    } catch (error) {
        console.error('Erreur get configs:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// POST /api/mobile-money/configs
router.post('/configs', tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        if (!req.userId) return res.status(401).json({ message: "Non authentifié" });
        const config = await mobileMoneyService.addConfig(dbClient, { ...req.body, userId: req.userId });
        res.json(config);
    } catch (error: any) {
        console.error('Erreur add config:', error);
        const errorMessage = error.message || "Erreur serveur";
        if (errorMessage === "Configuration introuvable ou accès refusé.") {
            res.status(404).json({ message: errorMessage });
        } else {
            res.status(500).json({ message: errorMessage });
        }
    }
});

// PUT /api/mobile-money/configs/:id
router.put('/configs/:id', tenantGuard, validate(configIdParam), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        if (!req.userId) return res.status(401).json({ message: "Non authentifié" });
        const id = req.params.id;
        if (!id) return res.status(400).json({ message: "ID manquant" });

        const config = await mobileMoneyService.updateConfig(dbClient, parseInt(id as string), req.userId, req.body);
        res.json(config);
    } catch (error: any) {
        console.error('Erreur update config:', error);
        const errorMessage = error.message || "Erreur serveur";
        if (errorMessage === "Configuration introuvable ou accès refusé.") {
            res.status(404).json({ message: errorMessage });
        } else {
            res.status(500).json({ message: errorMessage });
        }
    }
});

// DELETE /api/mobile-money/configs/:id
router.delete('/configs/:id', tenantGuard, validate(configIdParam), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        if (!req.userId) return res.status(401).json({ message: "Non authentifié" });
        const id = req.params.id;
        if (!id) return res.status(400).json({ message: "ID manquant" });

        await mobileMoneyService.deleteConfig(dbClient, parseInt(id as string), req.userId);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Erreur delete config:', error);
        const errorMessage = error.message || "Erreur serveur";
        if (errorMessage === "Configuration introuvable ou accès refusé.") {
            res.status(404).json({ message: errorMessage });
        } else {
            res.status(500).json({ message: errorMessage });
        }
    }
});

// PATCH /api/mobile-money/configs/:id/toggle
router.patch('/configs/:id/toggle', tenantGuard, validate(configIdParam), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        if (!req.userId) return res.status(401).json({ message: "Non authentifié" });
        const id = req.params.id;
        if (!id) return res.status(400).json({ message: "ID manquant" });
        
        const config = await mobileMoneyService.toggleConfigStatus(dbClient, parseInt(id as string), req.userId);
        res.json(config);
    } catch (error: any) {
        console.error('Erreur toggle config:', error);
        const errorMessage = error.message || "Erreur serveur";
        if (errorMessage === "Configuration introuvable ou accès refusé.") {
            res.status(404).json({ message: errorMessage });
        } else {
            res.status(500).json({ message: errorMessage });
        }
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — mobileMoneyRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par le commentaire d'avertissement.
 * ✅ tenantGuard ajouté post-authMiddleware sur absolument toutes les requêtes du routeur entier (6 routes).
 * ✅ Tous les pool.query() remplacés par req.dbClient.query() sur `GET /transactions` et pour la route POST /pay.
 * ✅ Le service mobileMoneyService est invoqué en passant dbClient sur les requêtes DB (`getConfigs`, `addConfig`...), mais les appels purement externes (`requestPayment`) ne prennent pas le dbClient.
 * ✅ strictOwnerId encapsulant `owner_id` est exploité pour le sous-enregistrement final dans `payments`.
 * ✅ Gestion granulaire des exceptions dans les routes `configs` qui mappent l'erreur `Configuration introuvable ou accès refusé.` renvoyée par le service vers une erreur 404 HTTP, et renvoient 500 dans les autres cas.
 * ═══════════════════════════════════════════════════
 */

export default router;
