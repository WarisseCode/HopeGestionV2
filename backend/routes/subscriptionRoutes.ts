// backend/routes/subscriptionRoutes.ts
import express from 'express';
const router = express.Router();

import { pool } from '../index';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { fedapayService, fedapayLogger as log } from '../services/fedapayService';

// GET /api/subscriptions/plans - Liste des offres disponibles
router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, display_name, price, duration_months, max_properties, max_tenants, features 
             FROM plans WHERE is_active = true ORDER BY price ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur récupération plans:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/subscriptions/status - Statut abonnement de l'utilisateur connecté
router.get('/status', protect, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.userId;

        // Get active subscription
        const subResult = await pool.query(
            `SELECT s.*, p.name as plan_name, p.display_name, p.max_properties, p.max_tenants, p.features
             FROM subscriptions s
             JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = $1 AND s.status = 'active'
             ORDER BY s.end_date DESC NULLS FIRST
             LIMIT 1`,
            [userId]
        );

        if (subResult.rows.length === 0) {
            // Default to Free plan
            const freePlan = await pool.query(`SELECT * FROM plans WHERE name = 'free' LIMIT 1`);
            
            let countPropertiesRes = await pool.query(`SELECT COUNT(l.id) as total_lots FROM lots l JOIN buildings b ON l.building_id = b.id JOIN owner_user ou ON b.owner_id = ou.owner_id WHERE ou.user_id = $1 AND ou.is_active = TRUE`, [userId]);
            let countTenantsRes = await pool.query(`SELECT COUNT(t.id) as total_tenants FROM tenants t JOIN owner_user ou ON t.owner_id = ou.owner_id WHERE ou.user_id = $1 AND ou.is_active = TRUE`, [userId]);

            return res.json({
                plan: freePlan.rows[0] || { name: 'free', display_name: 'Gratuit', max_properties: 3, max_tenants: 5 },
                status: 'free',
                days_remaining: null,
                is_premium: false,
                usage: {
                    current_properties: parseInt(countPropertiesRes.rows[0].total_lots),
                    current_tenants: parseInt(countTenantsRes.rows[0].total_tenants)
                }
            });
        }

        const subscription = subResult.rows[0];
        const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

        // Récupération de l'usage actuel
        let countPropertiesRes = await pool.query(
            `SELECT COUNT(l.id) as total_lots FROM lots l JOIN buildings b ON l.building_id = b.id JOIN owner_user ou ON b.owner_id = ou.owner_id WHERE ou.user_id = $1 AND ou.is_active = TRUE`,
            [userId]
        );
        let countTenantsRes = await pool.query(
            `SELECT COUNT(t.id) as total_tenants FROM tenants t JOIN owner_user ou ON t.owner_id = ou.owner_id WHERE ou.user_id = $1 AND ou.is_active = TRUE`,
            [userId]
        );

        res.json({
            subscription_id: subscription.id,
            plan: {
                id: subscription.plan_id,
                name: subscription.plan_name,
                display_name: subscription.display_name,
                max_properties: subscription.max_properties,
                max_tenants: subscription.max_tenants,
                features: subscription.features
            },
            status: subscription.status,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            days_remaining: daysRemaining,
            is_premium: subscription.plan_name !== 'free',
            usage: {
                current_properties: parseInt(countPropertiesRes.rows[0].total_lots),
                current_tenants: parseInt(countTenantsRes.rows[0].total_tenants)
            }
        });
    } catch (error) {
        console.error('Erreur statut abonnement:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// POST /api/subscriptions/subscribe - Souscrire à un plan (Paiement FedaPay)
router.post('/subscribe', protect, async (req: AuthenticatedRequest, res) => {
    const context = 'SUBSCRIBE';
    
    try {
        const userId = req.userId!;
        const { plan_id, phone_number, operator } = req.body;

        log.info(context, 'Subscription request received', { userId, plan_id, operator });

        // Validate inputs
        if (!plan_id || !phone_number || !operator) {
            return res.status(400).json({ message: "Plan, numéro et opérateur requis" });
        }

        // Validate operator
        const validOperators = ['mtn', 'moov', 'MTN', 'MOOV'];
        if (!validOperators.includes(operator)) {
            return res.status(400).json({ message: "Opérateur non supporté. Utilisez 'mtn' ou 'moov'" });
        }

        // Get plan details
        const planResult = await pool.query(`SELECT * FROM plans WHERE id = $1`, [plan_id]);
        if (planResult.rows.length === 0) {
            return res.status(404).json({ message: "Plan non trouvé" });
        }
        const plan = planResult.rows[0];

        // Free plan = no payment needed
        if (plan.price === 0 || plan.name === 'free') {
            log.info(context, 'Activating free plan directly', { userId });
            
            await pool.query(
                `INSERT INTO subscriptions (user_id, plan_id, status, start_date, end_date)
                 VALUES ($1, $2, 'active', NOW(), NULL)
                 ON CONFLICT DO NOTHING`,
                [userId, plan_id]
            );
            await pool.query(`UPDATE users SET current_plan_id = $1 WHERE id = $2`, [plan_id, userId]);
            
            return res.json({ 
                success: true, 
                message: "Plan Gratuit activé", 
                plan: plan,
                redirect: false
            });
        }

        // Get user details for FedaPay
        const userResult = await pool.query(
            `SELECT id, nom, email, telephone FROM users WHERE id = $1`,
            [userId]
        );
        const user = userResult.rows[0];

        // 1. Create Pending Subscription
        const subResult = await pool.query(
            `INSERT INTO subscriptions (user_id, plan_id, status, start_date, end_date)
             VALUES ($1, $2, 'pending_payment', NOW(), NULL)
             RETURNING id`,
            [userId, plan_id]
        );
        const subscriptionId = subResult.rows[0].id;

        // 2. Record Payment Attempt (pending)
        const paymentResult = await pool.query(
            `INSERT INTO subscription_payments (subscription_id, user_id, plan_id, amount, operator, phone_number, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING id`,
            [subscriptionId, userId, plan_id, plan.price, operator.toLowerCase(), phone_number]
        );
        const paymentId = paymentResult.rows[0].id;

        log.info(context, 'Created pending subscription and payment', { subscriptionId, paymentId });

        // 3. Create FedaPay Transaction
        const fedaResult = await fedapayService.createPaymentTransaction({
            userId: userId,
            userEmail: user.email || 'client@hopegestion.com',
            userPhone: phone_number,
            userName: user.nom || 'Client',
            amount: parseFloat(plan.price),
            operator: operator.toLowerCase() as 'mtn' | 'moov',
            plan: {
                planId: plan.id,
                planName: plan.name,
                planType: 'mensuel',
                durationMonths: plan.duration_months || 1
            },
            internalReference: String(paymentId)
        });

        if (!fedaResult.success || !fedaResult.paymentUrl) {
            log.error(context, 'FedaPay transaction creation failed', fedaResult);
            
            // Mark as failed
            await pool.query(`UPDATE subscriptions SET status = 'failed' WHERE id = $1`, [subscriptionId]);
            await pool.query(`UPDATE subscription_payments SET status = 'failed' WHERE id = $1`, [paymentId]);
            
            return res.status(500).json({
                success: false,
                message: fedaResult.message || "Erreur lors de la création du paiement",
                redirect: false
            });
        }

        // 4. Update payment with FedaPay transaction ID
        await pool.query(
            `UPDATE subscription_payments SET transaction_reference = $1 WHERE id = $2`,
            [fedaResult.transactionId, paymentId]
        );

        log.info(context, '✅ FedaPay transaction created successfully', {
            transactionId: fedaResult.transactionId,
            paymentUrl: fedaResult.paymentUrl
        });

        // 5. Return payment URL for frontend to redirect
        return res.json({
            success: true,
            message: "Redirection vers le paiement...",
            redirect: true,
            payment_url: fedaResult.paymentUrl,
            transaction_id: fedaResult.transactionId,
            plan: plan
        });

    } catch (error: any) {
        log.error(context, 'Subscription error', error);
        res.status(500).json({ message: "Erreur serveur lors de la souscription" });
    }
});

// GET /api/subscriptions/history - Historique des paiements d'abonnement
router.get('/history', protect, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(
            `SELECT sp.*, p.name as plan_name, p.display_name
             FROM subscription_payments sp
             JOIN plans p ON sp.plan_id = p.id
             WHERE sp.user_id = $1
             ORDER BY sp.payment_date DESC
             LIMIT 20`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/subscriptions/check-payment/:transactionId - Vérifier statut paiement
// GET /api/subscriptions/check-payment/:transactionId - Vérifier statut et activer si nécessaire
router.get('/check-payment/:transactionId', protect, async (req: AuthenticatedRequest, res) => {
    const context = 'CHECK_PAYMENT_MANUAL';
    try {
        const transactionId: string = req.params.transactionId as string;
        const userId = req.userId!;

        if (!transactionId) {
            return res.status(400).json({ message: "Transaction ID requis" });
        }

        log.info(context, 'Manual payment validation requested', { transactionId, userId });

        // 1. Check FedaPay Status
        const fedaResult = await fedapayService.getTransactionStatus(transactionId);
        
        if (fedaResult.status !== 'approved') {
            return res.json({ 
                status: fedaResult.status, 
                message: 'Paiement non approuvé' 
            });
        }

        // 2. Check if already processed locally
        const paymentCheck = await pool.query(
            `SELECT id, status FROM subscription_payments 
             WHERE transaction_reference = $1`,
            [transactionId]
        );

        if (paymentCheck.rows.length > 0 && paymentCheck.rows[0].status === 'approved') {
            return res.json({ 
                status: 'approved', 
                message: 'Paiement déjà validé',
                alreadyProcessed: true
            });
        }

            // 3. ACTIVATE SUBSCRIPTION (Manual Fallback for Webhook)
            log.info(context, '⚠️ Manual activation triggered (Webhook fallback)', { transactionId });

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Get subscription ID linked to this payment
                const paymentRes = await client.query(
                    `SELECT subscription_id, user_id, plan_id FROM subscription_payments 
                     WHERE transaction_reference = $1`,
                    [transactionId]
                );

                if (paymentRes.rows.length === 0) {
                    throw new Error(`Paiement introuvable pour la ref ${transactionId}`);
                }

                const { subscription_id, user_id: paymentUserId, plan_id: paymentPlanId } = paymentRes.rows[0];
                
                // Double check user match
                if (paymentUserId !== userId) {
                    throw new Error('Transaction ne correspond pas à l\'utilisateur'); 
                }

                const metadata = fedaResult.transaction?.custom_metadata || {};
                const durationMonths = metadata.duration_months ? parseInt(metadata.duration_months) : 1;
                
                // Calculate end date
                const startDate = new Date();
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + durationMonths);

                // Update the PENDING Subscription
                await client.query(
                    `UPDATE subscriptions 
                     SET status = 'active', 
                         start_date = $1, 
                         end_date = $2, 
                         updated_at = NOW()
                     WHERE id = $3`,
                    [startDate, endDate, subscription_id]
                );

                // Update Payment status
                await client.query(
                    `UPDATE subscription_payments 
                     SET status = 'approved', 
                         payment_date = NOW()
                     WHERE transaction_reference = $1`,
                    [transactionId]
                );

                // Update User Profile
                await client.query(
                    `UPDATE users SET current_plan_id = $1 WHERE id = $2`,
                    [paymentPlanId, userId]
                );

                await client.query('COMMIT');

                log.info(context, '✅ Subscription activated manually', { userId, planId: paymentPlanId });

                return res.json({ 
                    status: 'approved', 
                    message: 'Abonnement activé avec succès',
                    activated: true
                });

            } catch (dbError) {
                await client.query('ROLLBACK');
                throw dbError;
            } finally {
                client.release();
            }

    } catch (error) {
        console.error('Erreur vérification paiement:', error);
        res.status(500).json({ message: "Erreur serveur lors de la vérification", error: error });
    }
});

export default router;
