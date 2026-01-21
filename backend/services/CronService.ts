// backend/services/CronService.ts
import cron from 'node-cron';
import pool from '../db/database';
import { NotificationService } from './notificationService';

export class CronService {
    
    /**
     * Initialize all scheduled jobs
     */
    static init() {
        console.log('⏰ Initialisation du service d\'automatisation (Cron)...');

        // 1. Rent Reminder: Every day at 09:00 AM
        // Checks for late payments
        cron.schedule('0 9 * * *', async () => {
             console.log('Running Auto-Job: Check Late Payments...');
             await this.checkLatePayments();
        });

        // 2. Lease Expiration: Every day at 10:00 AM
        // Checks for contracts ending in 30 days
        cron.schedule('0 10 * * *', async () => {
             console.log('Running Auto-Job: Check Lease Expirations...');
             await this.checkLeaseExpirations();
        });

        // 3. Subscription Expiration: Every day at 08:00 AM
        // Marks expired subscriptions and notifies users
        cron.schedule('0 8 * * *', async () => {
             console.log('Running Auto-Job: Check Subscription Expirations...');
             await this.checkSubscriptionExpirations();
        });
        
        console.log('✅ Tâches planifiées (08:00, 09:00 & 10:00).');
    }

    /**
     * Check for active leases that haven't paid rent for the current month
     * Also updates payment_schedules statut to 'retard' for overdue entries
     */
    static async checkLatePayments(force = false) {
        const client = await pool.connect();
        try {
            const today = new Date();
            const dayOfMonth = today.getDate();
            
            // Only alert if we are past the 5th of the month, unless forced
            if (!force && dayOfMonth < 6) {
                console.log('ℹ️ Too early in the month to check late payments (Wait until 6th).');
                return; 
            }

            console.log('🔍 Checking for late payments...');

            // Module V: Update overdue payment_schedules to 'retard'
            const updateOverdueQuery = `
                UPDATE payment_schedules 
                SET statut = 'retard' 
                WHERE statut = 'en_attente' 
                AND date_echeance < CURRENT_DATE
            `;
            const overdueResult = await client.query(updateOverdueQuery);
            if (overdueResult.rowCount && overdueResult.rowCount > 0) {
                console.log(`📛 Marked ${overdueResult.rowCount} schedules as 'retard'`);
            }

            // Find active leases WITHOUT a payment for the current month
            // We verify:
            // 1. Lease is active
            // 2. No payment exists with date_payment in current month/year
            const query = `
                SELECT 
                    l.id, l.lot_id, l.tenant_id, l.loyer_actuel,
                    t.nom, t.prenoms,
                    b.user_id as owner_id -- We notify the owner/manager of the building
                FROM leases l
                JOIN tenants t ON l.tenant_id = t.id
                JOIN lots lo ON l.lot_id = lo.id
                JOIN buildings b ON lo.building_id = b.id
                WHERE l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p 
                    WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                )
            `;

            const result = await client.query(query);

            for (const lease of result.rows) {
                const title = `⚠️ Retard de Loyer`;
                const message = `Le locataire ${lease.nom} ${lease.prenoms} n'a pas encore réglé son loyer de ${lease.loyer_actuel} FCFA pour ce mois.`;
                
                // Avoid spamming: Check if we already sent this notification today
                const userId = lease.owner_id; // Notify the manager/owner
                
                const exists = await client.query(
                    `SELECT id FROM notifications 
                     WHERE user_id = $1 AND title = $2 
                     AND created_at::date = CURRENT_DATE`,
                    [userId, title]
                );

                if (exists.rowCount === 0) {
                    await NotificationService.send(userId, title, message, 'warning', 'PAYMENT_REMINDER');
                    console.log(`[CRON] Sent Late Payment Alert for Lease ${lease.id} to User ${userId}`);
                }
            }

        } catch (error) {
            console.error('❌ Error in checkLatePayments:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Check for leases ending in exactly 30 days
     */
    static async checkLeaseExpirations() {
        const client = await pool.connect();
        try {
            console.log('🔍 Checking for lease expirations...');

            const query = `
                SELECT 
                    l.id, l.date_fin,
                    t.nom, t.prenoms,
                    b.user_id as owner_id
                FROM leases l
                JOIN tenants t ON l.tenant_id = t.id
                JOIN lots lo ON l.lot_id = lo.id
                JOIN buildings b ON lo.building_id = b.id
                WHERE l.statut = 'actif'
                AND l.date_fin = CURRENT_DATE + INTERVAL '30 days'
            `;

            const result = await client.query(query);

            for (const lease of result.rows) {
                 const title = `📅 Expiration de Contrat`;
                 const message = `Le contrat de ${lease.nom} ${lease.prenoms} expire dans 30 jours (le ${new Date(lease.date_fin).toLocaleDateString()}). Pensez au renouvellement.`;
                 
                 const userId = lease.owner_id;

                 await NotificationService.send(userId, title, message, 'info', 'LEASE_EXPIRY');
                 console.log(`[CRON] Sent Expiration Alert for Lease ${lease.id} to User ${userId}`);
            }

        } catch (error) {
             console.error('❌ Error in checkLeaseExpirations:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Check for expired subscriptions and downgrade to Free plan
     */
    static async checkSubscriptionExpirations() {
        const client = await pool.connect();
        try {
            console.log('🔍 Checking for subscription expirations...');

            // 1. Find active subscriptions that have expired
            const expiredQuery = `
                UPDATE subscriptions 
                SET status = 'expired', updated_at = NOW()
                WHERE status = 'active' 
                AND end_date IS NOT NULL 
                AND end_date < NOW()
                RETURNING user_id, plan_id
            `;
            const expiredResult = await client.query(expiredQuery);

            if (expiredResult.rowCount && expiredResult.rowCount > 0) {
                console.log(`📛 Marked ${expiredResult.rowCount} subscriptions as 'expired'`);

                // Reset users to Free plan
                const freePlanResult = await client.query(`SELECT id FROM plans WHERE name = 'free' LIMIT 1`);
                const freePlanId = freePlanResult.rows[0]?.id || 1;

                for (const sub of expiredResult.rows) {
                    await client.query(`UPDATE users SET current_plan_id = $1 WHERE id = $2`, [freePlanId, sub.user_id]);
                    
                    // Send notification
                    const title = `⚠️ Abonnement Expiré`;
                    const message = `Votre abonnement a expiré. Vous êtes maintenant sur le plan Gratuit. Renouvelez pour continuer à profiter des fonctionnalités premium.`;
                    await NotificationService.send(sub.user_id, title, message, 'warning', 'SUBSCRIPTION_EXPIRED');
                    console.log(`[CRON] Sent Subscription Expiry Alert to User ${sub.user_id}`);
                }
            }

            // 2. Send reminder 7 days before expiration
            const reminderQuery = `
                SELECT s.user_id, s.end_date, p.display_name
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status = 'active' 
                AND s.end_date IS NOT NULL 
                AND s.end_date::date = (CURRENT_DATE + INTERVAL '7 days')::date
            `;
            const reminderResult = await client.query(reminderQuery);

            for (const sub of reminderResult.rows) {
                const title = `📅 Abonnement Bientôt Expiré`;
                const message = `Votre abonnement ${sub.display_name} expire dans 7 jours. Pensez à le renouveler !`;
                await NotificationService.send(sub.user_id, title, message, 'info', 'SUBSCRIPTION_REMINDER');
                console.log(`[CRON] Sent Subscription Reminder to User ${sub.user_id}`);
            }

        } catch (error) {
            console.error('❌ Error in checkSubscriptionExpirations:', error);
        } finally {
            client.release();
        }
    }
}
