
import pool from '../db/database';
import { WhatsAppService } from './WhatsAppService';

export class NotificationService {
    
    /**
     * Send a notification to a user (DB + External if needed)
     */
    static async send(userId: number, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        try {
            // 1. Save to DB
            const result = await pool.query(
                `INSERT INTO notifications (user_id, title, message, type) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [userId, title, message, type]
            );

            // 2. Simulate Real-time / External
            console.log(`[NOTIF] User ${userId}: ${title} - ${message}`);

            return result.rows[0];
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Send a WhatsApp message via provider (Twilio/Meta) or Simulation
     */
    static async sendWhatsApp(phone: string, message: string) {
        return await WhatsAppService.send(phone, message);
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(id: number) {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    }

    /**
     * Mark all for user as read
     */
    static async markAllRead(userId: number) {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    }
}
