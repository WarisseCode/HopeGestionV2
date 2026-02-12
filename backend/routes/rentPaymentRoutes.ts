// backend/routes/rentPaymentRoutes.ts
// API Routes for online rent payments via FedaPay
// Updated: 2026-02-10

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { rentPaymentService } from '../services/RentPaymentService';
import type { CreateRentPaymentRequest } from '../services/RentPaymentService';
import type { WebhookPayload } from '../services/fedapayService';

const router = Router();

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
 */
router.get('/:leaseId/pending', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const leaseId = parseInt(req.params.leaseId || '0');
        const userId = req.userId;

        // Verify the user is the tenant of this lease
        // For now, we'll trust the auth middleware
        // TODO: Add explicit authorization check

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
router.post('/initiate', async (req: AuthenticatedRequest, res: Response) => {
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
 */
router.get('/verify/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionId = parseInt(req.params.transactionId || '0');
        const userId = req.userId;

        const result = await rentPaymentService.verifyTransactionStatus(transactionId, userId!);

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
 */
router.get('/receipt/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const transactionId = parseInt(req.params.transactionId || '0');
        const tenantId = req.userId;

        // Get transaction and associated payment
        const result = await rentPaymentService.getReceiptUrl(transactionId, tenantId!);

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

export default router;
