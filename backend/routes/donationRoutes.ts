// backend/routes/donationRoutes.ts
// Dons de soutien à la plateforme — initiés uniquement par le super-admin
// depuis le dashboard (pas de compte donateur, pas de page publique pour
// l'instant). Réutilise fedapayService tel quel (aucune modification) :
// le don est un simple nouveau `plan_type` dans le custom_metadata FedaPay,
// au même titre que 'rent' pour rentPaymentRoutes.ts.
//
// [IMPORTANT — à trancher avant mise en prod] `fedapayService.createPaymentTransaction`
// utilise une seule URL de callback globale (`FEDAPAY_CALLBACK_URL`, .env) pour TOUTES
// les transactions qu'il crée, quel que soit l'appelant. Pour que /api/donations/webhook
// reçoive effectivement les événements FedaPay, `FEDAPAY_CALLBACK_URL` doit pointer vers
// cette route (ou un mécanisme de dispatch par plan_type doit être ajouté en amont) —
// hors périmètre de cette tâche, signalé pour décision produit avant l'étape 2.
//
// [MONTAGE — index.ts] Monter CE routeur SANS `protect` global (comme subscriptionRoutes.ts,
// PAS comme rentPaymentRoutes.ts) : `/webhook` est appelé directement par FedaPay, sans
// jeton Bearer — un `protect` global le ferait échouer en 401. `protect` est donc appliqué
// route par route ci-dessous, uniquement sur les endpoints admin.
//   app.use('/api/donations', donationRoutes);

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { fedapayService } from '../services/fedapayService';
import type { WebhookPayload, PaymentOperator } from '../services/fedapayService';
import { donationReceiptService } from '../services/DonationReceiptService';
import pool from '../db/database';

const router = Router();

// ============================================================================
// AUTH GUARD — réservé au super-admin (même middleware que adminRoutes.ts)
// ============================================================================
const verifyAdmin = (req: AuthenticatedRequest, res: Response, next: any) => {
    if (req.userRole === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }
};

// ============================================================================
// VALIDATION RULES
// ============================================================================
const donationCreateRules = [
    body('donorName').notEmpty().withMessage('Le nom du donateur est obligatoire').bail().isString().isLength({ max: 255 }).withMessage('Nom trop long'),
    body('donorEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('donorPhone').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }).withMessage('Téléphone invalide'),
    body('amount').notEmpty().withMessage('Le montant est obligatoire').bail().isFloat({ gt: 0 }).withMessage('Montant invalide'),
    body('operator').notEmpty().withMessage('operator est obligatoire').bail().isIn(['mtn', 'moov']).withMessage('Opérateur invalide (mtn ou moov)'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Description trop longue'),
];
const donationIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];

// ============================================================================
// POST /api/donations — Initier un don (super-admin)
// ============================================================================
router.post('/', protect, verifyAdmin, validate(donationCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    const { donorName, donorEmail, donorPhone, amount, operator, description } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Créer l'enregistrement en base (statut pending)
        const insertRes = await client.query(
            `INSERT INTO donations (donor_name, donor_email, donor_phone, amount, description, status, created_by)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6)
             RETURNING id`,
            [donorName, donorEmail || null, donorPhone || null, amount, description || null, req.userId]
        );
        const donationId = insertRes.rows[0].id;

        // 2. Créer la transaction FedaPay — `plan_type: 'donation'` est le discriminant
        // utilisé par le webhook pour distinguer un don d'un abonnement/loyer.
        // `plan.planId` porte l'ID du don (relu tel quel côté webhook, comme
        // rentPaymentRoutes.ts le fait avec scheduleId).
        const fedaResult = await fedapayService.createPaymentTransaction({
            userId: req.userId!,
            userEmail: donorEmail || 'don@hopegestion.com',
            userPhone: donorPhone || '',
            userName: donorName,
            amount: parseFloat(amount),
            operator: operator as PaymentOperator,
            plan: {
                planId: donationId,
                planName: description || 'Don de soutien',
                planType: 'donation',
                durationMonths: 0,
            },
            internalReference: `DONATION_${donationId}`,
        });

        if (!fedaResult.success) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: fedaResult.message || 'Erreur lors de la création de la transaction FedaPay',
            });
        }

        // 3. Enregistrer la référence FedaPay + l'URL de paiement
        await client.query(
            `UPDATE donations SET fedapay_transaction_id = $1, payment_url = $2, updated_at = NOW() WHERE id = $3`,
            [fedaResult.transactionId, fedaResult.paymentUrl, donationId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            donation: { id: donationId, status: 'pending' },
            paymentUrl: fedaResult.paymentUrl,
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[DonationRoutes] Error creating donation:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création du don.' });
    } finally {
        client.release();
    }
});

// ============================================================================
// POST /api/donations/webhook — Webhook FedaPay (pas d'auth : appelé par FedaPay)
// Suit exactement le pattern de rentPaymentRoutes.ts : re-vérification du
// statut réel auprès de FedaPay, jamais confiance aveugle au payload reçu.
// ============================================================================
router.post('/webhook', async (req, res: Response) => {
    try {
        const payload = req.body as WebhookPayload;

        console.log('[DonationWebhook] Received webhook:', {
            event: payload?.name,
            transactionId: payload?.object?.id,
        });

        if (!payload.object || !payload.object.id) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const fedapayTransactionId = String(payload.object.id);
        const eventName = payload.name;

        // Ce webhook ne traite que les dons — tout autre plan_type est ignoré
        // (permet, si besoin, de partager le même FEDAPAY_CALLBACK_URL plus tard).
        const metadata = payload.object.custom_metadata || {};
        if ((metadata as any).plan_type !== 'donation') {
            console.log('[DonationWebhook] Not a donation, ignoring');
            return res.status(200).json({ received: true, ignored: true });
        }

        const donationId = parseInt((metadata as any).plan_id, 10);
        if (!donationId) {
            console.warn('[DonationWebhook] Missing/invalid plan_id (donation_id) in metadata');
            return res.status(400).json({ error: 'Missing donation id in metadata' });
        }

        // [SÉCURITÉ] Re-vérifier le statut réel auprès de l'API FedaPay avant tout
        // traitement — protège contre un payload forgé (faux "transaction.approved"
        // sans paiement réel). Ne jamais traiter sur la seule foi du payload entrant.
        const verifiedTx = await fedapayService.getTransactionStatus(fedapayTransactionId);
        if (!verifiedTx || verifiedTx.error) {
            console.warn(`[DonationWebhook] Impossible de vérifier la transaction ${fedapayTransactionId} auprès de FedaPay. Ignoré.`);
            return res.status(200).json({ received: true, ignored: true, reason: 'unverifiable' });
        }

        const fedapayStatusMap: Record<string, string> = {
            'approved': 'transaction.approved',
            'declined': 'transaction.declined',
            'canceled': 'transaction.canceled',
        };
        const expectedEvent = fedapayStatusMap[verifiedTx.status];
        if (expectedEvent && expectedEvent !== eventName) {
            console.warn(`[DonationWebhook] Discordance statut: webhook="${eventName}" vs FedaPay="${verifiedTx.status}". Ignoré.`);
            return res.status(200).json({ received: true, ignored: true, reason: 'status_mismatch' });
        }

        // Idempotence : un don déjà approuvé ne doit pas être re-traité (pas de double
        // génération de reçu).
        const currentRes = await pool.query('SELECT status FROM donations WHERE id = $1', [donationId]);
        if (currentRes.rows.length === 0) {
            console.warn(`[DonationWebhook] Donation ${donationId} introuvable.`);
            return res.status(200).json({ received: true, ignored: true, reason: 'donation_not_found' });
        }
        if (currentRes.rows[0].status === 'approved' && eventName === 'transaction.approved') {
            console.log(`[DonationWebhook] Donation ${donationId} déjà approuvée. Skip.`);
            return res.status(200).json({ received: true, idempotent: true });
        }

        switch (eventName) {
            case 'transaction.approved': {
                await pool.query(
                    `UPDATE donations
                     SET status = 'approved', paid_at = NOW(), fedapay_transaction_id = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [fedapayTransactionId, donationId]
                );
                try {
                    await donationReceiptService.generateReceipt(donationId);
                } catch (receiptError) {
                    // Le don reste approuvé même si la génération du reçu échoue —
                    // ne bloque jamais la confirmation du paiement.
                    console.error('[DonationWebhook] Receipt generation failed:', receiptError);
                }
                break;
            }
            case 'transaction.declined':
                await pool.query(
                    `UPDATE donations SET status = 'declined', updated_at = NOW() WHERE id = $1`,
                    [donationId]
                );
                break;
            case 'transaction.canceled':
                await pool.query(
                    `UPDATE donations SET status = 'canceled', updated_at = NOW() WHERE id = $1`,
                    [donationId]
                );
                break;
            default:
                console.log('[DonationWebhook] Unhandled event:', eventName);
        }

        res.status(200).json({ received: true, event: eventName, transactionId: fedapayTransactionId });

    } catch (error: any) {
        console.error('[DonationWebhook] Error processing webhook:', error);
        // Toujours 200 pour éviter les retries FedaPay sur nos propres erreurs.
        res.status(200).json({ received: true, error: 'Internal processing error', message: error.message });
    }
});

// ============================================================================
// GET /api/donations — Liste des dons (super-admin), filtres statut/période
// ============================================================================
router.get('/', protect, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { status, from, to } = req.query;

        const params: any[] = [];
        const conditions: string[] = [];

        if (status && typeof status === 'string') {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (from && typeof from === 'string') {
            params.push(from);
            conditions.push(`created_at >= $${params.length}`);
        }
        if (to && typeof to === 'string') {
            params.push(to);
            conditions.push(`created_at <= $${params.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT id, donor_name, donor_email, donor_phone, amount, currency, description,
                    status, fedapay_transaction_id, payment_url, receipt_url, created_by,
                    created_at, updated_at, paid_at
             FROM donations
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT 200`,
            params
        );

        res.json({ success: true, donations: result.rows });

    } catch (error: any) {
        console.error('[DonationRoutes] Error listing donations:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des dons.' });
    }
});

// ============================================================================
// GET /api/donations/:id — Détail d'un don (super-admin)
// ============================================================================
router.get('/:id', protect, verifyAdmin, validate(donationIdParam), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM donations WHERE id = $1', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Don introuvable.' });
        }

        res.json({ success: true, donation: result.rows[0] });

    } catch (error: any) {
        console.error('[DonationRoutes] Error fetching donation:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du don.' });
    }
});

export default router;
