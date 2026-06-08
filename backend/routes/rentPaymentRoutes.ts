// backend/routes/rentPaymentRoutes.ts
// API Routes for online rent payments via FedaPay
// Updated: 2026-02-10

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { rentPaymentService } from '../services/RentPaymentService';
import type { CreateRentPaymentRequest } from '../services/RentPaymentService';
import { fedapayService } from '../services/fedapayService';
import type { WebhookPayload } from '../services/fedapayService';
import permissions from '../middleware/permissionMiddleware';
import { filterByOwner, buildOwnerWhereClause } from '../middleware/ownerIsolation';
import { validate } from '../middleware/validate';
import pool from '../db/database';

const router = Router();

// /initiate : formalise la validation manuelle existante (scheduleId int + opérateur).
// NB : /webhook n'est PAS validé ici — il est gardé par vérification IP + re-check
// upstream FedaPay (payload externe au format variable).
const initiateRules = [
    body('scheduleId').notEmpty().withMessage('scheduleId est obligatoire').bail().isInt({ min: 1 }).withMessage('scheduleId invalide'),
    body('operator').notEmpty().withMessage('operator est obligatoire').bail().isIn(['mtn', 'moov']).withMessage('Opérateur invalide (mtn ou moov)'),
];

// ============================================================================
// GET PENDING SCHEDULES
// ============================================================================

/**
 * GET /api/rent-payments/my-pending - Get pending payments for logged-in user
 */
router.get('/my-pending', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const schedules = await rentPaymentService.getPendingSchedulesForUser(userId);
        res.json(schedules);
    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching user pending schedules:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des loyers en attente.' });
    }
});

/**
 * GET /api/rent-payments/:leaseId/pending
 * Get pending payment schedules for a lease
 * [LOCATAIRE] Isolation par tenant.user_id = req.userId — tenantGuard non applicable.
 */
router.get('/:leaseId/pending', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const leaseId = parseInt(req.params.leaseId || '0');
        const userId = req.userId!;

        // [SÉCURITÉ] Vérifie que ce bail appartient bien au locataire connecté
        const ownershipCheck = await pool.query(
            `SELECT l.id FROM leases l
             JOIN tenants t ON l.tenant_id = t.id
             WHERE l.id = $1 AND t.user_id = $2`,
            [leaseId, userId]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé à ce bail.'
            });
        }

        const schedules = await rentPaymentService.getPendingSchedules(leaseId);

        res.json({
            success: true,
            schedules
        });

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching pending schedules:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la récupération des échéances'
        });
    }
});

// ============================================================================
// INITIATE PAYMENT
// ============================================================================

/**
 * POST /api/rent-payments/initiate
 * Create a payment link for a rent payment schedule
 */
router.post('/initiate', validate(initiateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { scheduleId, operator } = req.body;
        const tenantId = req.userId;

        // Validation
        if (!scheduleId || !operator) {
            return res.status(400).json({
                success: false,
                message: 'scheduleId et operator sont requis'
            });
        }

        if (!['mtn', 'moov'].includes(operator)) {
            return res.status(400).json({
                success: false,
                message: 'Opérateur invalide. Utilisez "mtn" ou "moov"'
            });
        }

        const request: CreateRentPaymentRequest = {
            scheduleId: parseInt(scheduleId),
            tenantId: tenantId!,
            operator
        };

        const result = await rentPaymentService.createPaymentLink(request);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error initiating payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la création du lien de paiement'
        });
    }
});

// ============================================================================
// WEBHOOK FROM FEDAPAY
// ============================================================================

/**
 * POST /api/rent-payments/webhook
 * Handle FedaPay webhook notifications
 */
router.post('/webhook', async (req, res: Response) => {
    try {
        const payload = req.body as WebhookPayload;

        console.log('[RentPaymentWebhook] Received webhook:', {
            event: payload.name,
            transactionId: payload.object?.id
        });

        // Validate payload structure
        if (!payload.object || !payload.object.id) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const fedapayTransactionId = String(payload.object.id);
        const eventName = payload.name;

        // Check if this is a rent payment transaction
        // We identify it by the custom_metadata.plan_type = 'rent'
        const metadata = payload.object.custom_metadata || {};
        if (metadata.plan_type !== 'rent') {
            console.log('[RentPaymentWebhook] Not a rent payment, ignoring');
            return res.status(200).json({ received: true, ignored: true });
        }

        // [SÉCURITÉ] Re-vérifier le statut réel auprès de l'API FedaPay avant tout traitement.
        // Protège contre les requêtes forgées : un attaquant connaissant l'URL du webhook
        // pourrait envoyer un faux payload "transaction.approved" sans avoir réellement payé.
        // La vérification via sk_live garantit que FedaPay confirme bien le statut.
        const verifiedTx = await fedapayService.getTransactionStatus(fedapayTransactionId);
        if (!verifiedTx || verifiedTx.error) {
            console.warn(`[RentPaymentWebhook] Impossible de vérifier la transaction ${fedapayTransactionId} auprès de FedaPay. Ignoré.`);
            return res.status(200).json({ received: true, ignored: true, reason: 'unverifiable' });
        }

        // Mapping statuts FedaPay → statuts internes
        const fedapayStatusMap: Record<string, string> = {
            'approved': 'transaction.approved',
            'declined': 'transaction.declined',
            'canceled': 'transaction.canceled',
        };
        const expectedEvent = fedapayStatusMap[verifiedTx.status];
        if (expectedEvent && expectedEvent !== eventName) {
            console.warn(`[RentPaymentWebhook] Discordance statut: webhook="${eventName}" vs FedaPay="${verifiedTx.status}". Ignoré.`);
            return res.status(200).json({ received: true, ignored: true, reason: 'status_mismatch' });
        }

        // Process based on event type
        switch (eventName) {
            case 'transaction.approved':
                await rentPaymentService.processPaymentConfirmation(
                    fedapayTransactionId,
                    'approved'
                );
                break;

            case 'transaction.declined':
            case 'transaction.canceled':
                await rentPaymentService.processPaymentConfirmation(
                    fedapayTransactionId,
                    eventName === 'transaction.declined' ? 'failed' : 'cancelled'
                );
                break;

            default:
                console.log('[RentPaymentWebhook] Unhandled event:', eventName);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({
            received: true,
            event: eventName,
            transactionId: fedapayTransactionId
        });

    } catch (error: any) {
        console.error('[RentPaymentWebhook] Error processing webhook:', error);
        // Still return 200 to prevent FedaPay retries
        res.status(200).json({
            received: true,
            error: 'Internal processing error',
            message: error.message
        });
    }
});

// ============================================================================
// VERIFY TRANSACTION STATUS
// ============================================================================

/**
 * GET /api/rent-payments/verify/:transactionId
 * Manually trigger verification of a transaction (upstream check)
 * [LOCATAIRE] Isolation par tenant.user_id = req.userId — tenantGuard non applicable.
 */
router.get('/verify/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionId = parseInt(req.params.transactionId || '0');
        const userId = req.userId!;

        // [SÉCURITÉ] Vérifie que la transaction appartient bien au locataire connecté
        const ownershipCheck = await pool.query(
            `SELECT rpt.id FROM rent_payment_transactions rpt
             JOIN tenants t ON rpt.tenant_id = t.id
             WHERE rpt.id = $1 AND t.user_id = $2`,
            [transactionId, userId]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé à cette transaction.'
            });
        }

        const result = await rentPaymentService.verifyTransactionStatus(transactionId, userId);

        res.json(result);

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error verifying transaction:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la vérification'
        });
    }
});

// ============================================================================
// GET TRANSACTION HISTORY
// ============================================================================

/**
 * GET /api/rent-payments/history
 * Get payment transaction history for the authenticated tenant
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.userId;
        const limit = parseInt(req.query.limit as string) || 20;

        const history = await rentPaymentService.getTransactionHistory(tenantId!, limit);

        res.json({
            success: true,
            transactions: history
        });

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la récupération de l\'historique'
        });
    }
});

// ============================================================================
// GET RECEIPT URL
// ============================================================================

/**
 * GET /api/rent-payments/receipt/:transactionId
 * Get the receipt URL for a completed rent payment transaction
 * [LOCATAIRE] Isolation par tenant.user_id = req.userId — tenantGuard non applicable.
 */
router.get('/receipt/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionId = parseInt(req.params.transactionId || '0');
        const userId = req.userId!;

        // [SÉCURITÉ] Vérifie que la transaction appartient bien au locataire connecté
        const ownershipCheck = await pool.query(
            `SELECT rpt.id FROM rent_payment_transactions rpt
             JOIN tenants t ON rpt.tenant_id = t.id
             WHERE rpt.id = $1 AND t.user_id = $2`,
            [transactionId, userId]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé à cette quittance.'
            });
        }

        const result = await rentPaymentService.getReceiptUrl(transactionId, userId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching receipt:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la récupération de la quittance'
        });
    }
});

// ============================================================================
// ADMIN: ONLINE PAYMENT TRANSACTIONS (Gestionnaire/Propriétaire)
// ============================================================================

/**
 * GET /api/rent-payments/admin/transactions
 * List online payment transactions (filtered by owner for gestionnaire)
 */
router.get('/admin/transactions', permissions.canRead('finance'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ownerIds: number[] | null = (req as any).ownerIds;
        if (ownerIds !== null && ownerIds.length === 0) {
            return res.json({ success: true, transactions: [], stats: { total: 0, pending: 0, approved: 0, failed: 0 } });
        }

        const { status: filterStatus, month, year } = req.query;
        const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

        const params: any[] = [targetMonth, targetYear];
        let ownerFilter = 'TRUE';
        if (ownerIds !== null) {
            params.push(ownerIds);
            ownerFilter = `l.owner_id = ANY($${params.length}::int[])`;
        }

        let statusFilter = '';
        if (filterStatus && ['pending', 'approved', 'failed', 'cancelled'].includes(filterStatus as string)) {
            params.push(filterStatus);
            statusFilter = `AND rpt.status = $${params.length}`;
        }

        const result = await pool.query(`
            SELECT
                rpt.id,
                rpt.schedule_id,
                rpt.amount,
                rpt.status,
                rpt.payment_method as operator,
                rpt.fedapay_transaction_id,
                rpt.created_at,
                rpt.paid_at,
                t.nom as tenant_nom,
                t.prenoms as tenant_prenoms,
                t.telephone_principal as tenant_telephone,
                ps.description as schedule_description,
                ps.due_date,
                lo.ref_lot as lot_reference,
                b.nom as building_name
            FROM rent_payment_transactions rpt
            JOIN tenants t ON rpt.tenant_id = t.id
            JOIN leases l ON rpt.lease_id = l.id
            LEFT JOIN payment_schedules ps ON rpt.schedule_id = ps.id
            LEFT JOIN lots lo ON l.lot_id = lo.id
            LEFT JOIN buildings b ON lo.building_id = b.id
            WHERE EXTRACT(MONTH FROM rpt.created_at) = $1
            AND EXTRACT(YEAR FROM rpt.created_at) = $2
            AND ${ownerFilter}
            ${statusFilter}
            ORDER BY rpt.created_at DESC
        `, params);

        res.json({
            success: true,
            transactions: result.rows
        });

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching admin transactions:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la récupération des transactions en ligne'
        });
    }
});

/**
 * GET /api/rent-payments/admin/stats
 * KPIs for online payments (filtered by owner for gestionnaire)
 */
router.get('/admin/stats', permissions.canRead('finance'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ownerIds: number[] | null = (req as any).ownerIds;
        if (ownerIds !== null && ownerIds.length === 0) {
            return res.json({
                success: true,
                stats: { total_online: 0, pending_count: 0, approved_count: 0, failed_count: 0, total_approved_amount: 0, total_pending_amount: 0 }
            });
        }

        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

        const params: any[] = [targetMonth, targetYear];
        let ownerFilter = 'TRUE';
        if (ownerIds !== null) {
            params.push(ownerIds);
            ownerFilter = `l.owner_id = ANY($${params.length}::int[])`;
        }

        const result = await pool.query(`
            SELECT
                COUNT(*) as total_online,
                COUNT(CASE WHEN rpt.status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN rpt.status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN rpt.status IN ('failed', 'cancelled') THEN 1 END) as failed_count,
                COALESCE(SUM(CASE WHEN rpt.status = 'approved' THEN rpt.amount ELSE 0 END), 0) as total_approved_amount,
                COALESCE(SUM(CASE WHEN rpt.status = 'pending' THEN rpt.amount ELSE 0 END), 0) as total_pending_amount
            FROM rent_payment_transactions rpt
            JOIN leases l ON rpt.lease_id = l.id
            WHERE EXTRACT(MONTH FROM rpt.created_at) = $1
            AND EXTRACT(YEAR FROM rpt.created_at) = $2
            AND ${ownerFilter}
        `, params);

        const stats = result.rows[0];

        res.json({
            success: true,
            stats: {
                total_online: parseInt(stats.total_online),
                pending_count: parseInt(stats.pending_count),
                approved_count: parseInt(stats.approved_count),
                failed_count: parseInt(stats.failed_count),
                total_approved_amount: parseFloat(stats.total_approved_amount),
                total_pending_amount: parseFloat(stats.total_pending_amount)
            }
        });

    } catch (error: any) {
        console.error('[RentPaymentRoutes] Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la récupération des statistiques'
        });
    }
});

export default router;
