
import pool from '../db/database';

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
     * Simulate sending a WhatsApp message via provider (Twilio/Meta)
     */
    static async sendWhatsApp(phone: string, message: string) {
        // In a real app, this would use axios to call Twilio API
        console.log(`[WHATSAPP] 📲 Sending to ${phone}:`);
        console.log(`           "${message}"`);
        
        // return axios.post('https://api.twilio.com/...')
        return { success: true, simulated: true };
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
