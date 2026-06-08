// backend/routes/fedapayWebhookRoutes.ts
// FedaPay Webhook Handler with Security, Idempotency, and Subscription Activation

import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../index';
import { fedapayService, fedapayLogger as log, WebhookPayload } from '../services/fedapayService';
import { NotificationService } from '../services/notificationService';

const router = express.Router();

// ============================================================================
// SECURITY: Known FedaPay IP Addresses (Sandbox + Production)
// These should be updated based on FedaPay documentation
// ============================================================================
const FEDAPAY_ALLOWED_IPS = [
    '127.0.0.1',           // Localhost for testing
    '::1',                 // IPv6 localhost
    '::ffff:127.0.0.1',    // IPv4-mapped IPv6 localhost
    // Add FedaPay production IPs here when available
    // '41.x.x.x', etc.
];

// For development, allow all IPs
const SKIP_IP_CHECK = process.env.NODE_ENV === 'development' || process.env.FEDAPAY_MODE === 'sandbox';

// ============================================================================
// MIDDLEWARE: IP Verification (Security Layer)
// ============================================================================
const verifyFedaPayIP = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    log.info('WEBHOOK_IP_CHECK', `Incoming webhook from IP: ${clientIP}`);
    
    if (SKIP_IP_CHECK) {
        log.warn('WEBHOOK_IP_CHECK', 'IP verification skipped (development/sandbox mode)');
        return next();
    }
    
    if (!FEDAPAY_ALLOWED_IPS.includes(clientIP)) {
        log.error('WEBHOOK_IP_CHECK', `Unauthorized IP attempted webhook: ${clientIP}`);
        return res.status(403).json({ error: 'Unauthorized IP address' });
    }
    
    next();
};

// ============================================================================
// IDEMPOTENCY: Check if transaction already processed
// ============================================================================
async function isTransactionAlreadyProcessed(fedaTransactionId: number): Promise<boolean> {
    const result = await pool.query(
        `SELECT id FROM subscription_payments 
         WHERE transaction_reference = $1 AND status = 'approved'`,
        [String(fedaTransactionId)]
    );
    return result.rowCount !== null && result.rowCount > 0;
}

// ============================================================================
// MAIN WEBHOOK ENDPOINT
// ============================================================================
router.post('/', verifyFedaPayIP, async (req: Request, res: Response) => {
    const context = 'WEBHOOK_HANDLER';
    const payload = req.body;
    
    log.info(context, '📥 Webhook received', {
        entity: payload?.entity,
        name: payload?.name,
        transactionId: payload?.object?.id
    });

    try {
        // 1. Validate payload structure
        if (!fedapayService.validateWebhookPayload(payload)) {
            log.warn(context, 'Invalid webhook payload structure', payload);
            return res.status(400).json({ error: 'Invalid payload structure' });
        }

        const webhookData = payload as WebhookPayload;
        const transactionId = webhookData.object.id;
        const eventName = webhookData.name;
        const transactionStatus = webhookData.object.status;

        log.info(context, `Processing event: ${eventName}`, {
            transactionId,
            status: transactionStatus,
            amount: webhookData.object.amount
        });

        // 2. Extract metadata
        const metadata = fedapayService.extractMetadataFromWebhook(webhookData);
        
        if (!metadata.userId) {
            log.error(context, 'Missing user_id in transaction metadata');
            return res.status(400).json({ error: 'Missing user_id in metadata' });
        }

        // 3. Idempotency check
        if (await isTransactionAlreadyProcessed(transactionId)) {
            log.warn(context, `Transaction ${transactionId} already processed. Skipping.`);
            return res.status(200).json({ 
                message: 'Transaction already processed',
                idempotent: true 
            });
        }

        // 4. Handle different webhook events
        switch (eventName) {
            case 'transaction.approved':
                await handleTransactionApproved(webhookData, metadata);
                break;
                
            case 'transaction.declined':
            case 'transaction.canceled':
                await handleTransactionFailed(webhookData, metadata, eventName);
                break;
                
            case 'transaction.created':
                log.info(context, 'Transaction created event - no action needed');
                break;
                
            default:
                log.warn(context, `Unhandled webhook event: ${eventName}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ 
            received: true, 
            event: eventName,
            transactionId 
        });

    } catch (error: any) {
        log.error(context, 'Webhook processing error', error);
        // Still return 200 to prevent FedaPay retries for our errors
        res.status(200).json({ 
            received: true, 
            error: 'Internal processing error',
            message: error.message 
        });
    }
});

// ============================================================================
// HANDLER: Transaction Approved
// ============================================================================
async function handleTransactionApproved(
    webhook: WebhookPayload, 
    metadata: ReturnType<typeof fedapayService.extractMetadataFromWebhook>
) {
    const context = 'TRANSACTION_APPROVED';
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const transactionId = webhook.object.id;
        const userId = metadata.userId!;
        const planId = metadata.planId || 1;
        const durationMonths = metadata.durationMonths || 1;
        const amount = webhook.object.amount;

        log.info(context, 'Activating subscription', {
            userId,
            planId,
            durationMonths,
            amount,
            transactionId
        });

        // 1. Calculate subscription dates
        const startDate = new Date();
        const endDate = fedapayService.calculateEndDate(startDate, durationMonths);

        // 2. Create or update subscription
        const subscriptionResult = await client.query(
            `INSERT INTO subscriptions (user_id, plan_id, status, start_date, end_date, created_at, updated_at)
             VALUES ($1, $2, 'active', $3, $4, NOW(), NOW())
             ON CONFLICT (user_id) WHERE status IN ('active', 'pending_payment')
             DO UPDATE SET 
                plan_id = EXCLUDED.plan_id,
                status = 'active',
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                updated_at = NOW()
             RETURNING id`,
            [userId, planId, startDate, endDate]
        );
        
        const subscriptionId = subscriptionResult.rows[0]?.id;

        // 3. Update payment record
        // PostgreSQL n'accepte pas ORDER BY/LIMIT dans un UPDATE direct → sous-requête
        await client.query(
            `UPDATE subscription_payments
             SET status = 'approved',
                 transaction_reference = $1,
                 updated_at = NOW()
             WHERE id = (
                 SELECT id FROM subscription_payments
                 WHERE user_id = $2 AND status = 'pending'
                 ORDER BY created_at DESC
                 LIMIT 1
             )`,
            [String(transactionId), userId]
        );

        // 4. Update user's current plan
        await client.query(
            `UPDATE users SET current_plan_id = $1 WHERE id = $2`,
            [planId, userId]
        );

        await client.query('COMMIT');

        log.info(context, '✅ Subscription activated successfully', {
            subscriptionId,
            userId,
            planId,
            endDate: endDate.toISOString()
        });

        // 5. Send notification to user
        await NotificationService.send(
            userId,
            '🎉 Abonnement Activé!',
            `Votre abonnement ${metadata.planName || 'Premium'} est maintenant actif jusqu'au ${endDate.toLocaleDateString('fr-FR')}.`,
            'success',
            'SUBSCRIPTION_ACTIVATED'
        );

    } catch (error: any) {
        await client.query('ROLLBACK');
        log.error(context, 'Failed to activate subscription', error);
        throw error;
    } finally {
        client.release();
    }
}

// ============================================================================
// HANDLER: Transaction Failed/Cancelled
// ============================================================================
async function handleTransactionFailed(
    webhook: WebhookPayload,
    metadata: ReturnType<typeof fedapayService.extractMetadataFromWebhook>,
    eventName: string
) {
    const context = 'TRANSACTION_FAILED';

    const transactionId = webhook.object.id;
    const userId = metadata.userId;

    log.info(context, `Processing failed/cancelled transaction`, {
        transactionId,
        userId,
        event: eventName
    });

    if (!userId) return;

    // Les deux UPDATE doivent être atomiques : si l'un échoue, l'autre est rollbacké
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // PostgreSQL n'accepte pas ORDER BY/LIMIT dans un UPDATE direct → sous-requête
        await client.query(
            `UPDATE subscription_payments
             SET status = 'failed',
                 transaction_reference = $1,
                 updated_at = NOW()
             WHERE id = (
                 SELECT id FROM subscription_payments
                 WHERE user_id = $2 AND status = 'pending'
                 ORDER BY created_at DESC
                 LIMIT 1
             )`,
            [String(transactionId), userId]
        );

        await client.query(
            `UPDATE subscriptions
             SET status = 'failed', updated_at = NOW()
             WHERE user_id = $1 AND status = 'pending_payment'`,
            [userId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        log.error(context, 'Failed to update failed transaction in DB', err);
        throw err;
    } finally {
        client.release();
    }

    const message = eventName === 'transaction.canceled'
        ? 'Vous avez annulé le paiement de votre abonnement.'
        : 'Le paiement de votre abonnement a échoué. Veuillez réessayer.';

    await NotificationService.send(
        userId,
        '❌ Paiement Non Abouti',
        message,
        'warning',
        'SUBSCRIPTION_PAYMENT_FAILED'
    );

    log.info(context, 'Transaction failure handled', { userId, transactionId });
}

// ============================================================================
// TEST ENDPOINT: Manual webhook test (for local testing)
// ============================================================================
router.get('/test-status', async (req: Request, res: Response) => {
    res.json({ 
        status: 'active',
        mode: process.env.FEDAPAY_MODE || 'sandbox',
        webhook_url: process.env.FEDAPAY_CALLBACK_URL,
        message: 'FedaPay webhook endpoint is ready'
    });
});

export default router;
