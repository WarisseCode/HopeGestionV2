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
        
        console.log('✅ Tâches planifiées (09:00 & 10:00).');
    }

    /**
     * Check for active leases that haven't paid rent for the current month
     * Triggered if current day > 5 (or custom due date)
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
                    await NotificationService.send(userId, title, message, 'warning');
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

                 await NotificationService.send(userId, title, message, 'info');
                 console.log(`[CRON] Sent Expiration Alert for Lease ${lease.id} to User ${userId}`);
            }

        } catch (error) {
             console.error('❌ Error in checkLeaseExpirations:', error);
        } finally {
            client.release();
        }
    }
}
