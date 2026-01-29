"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_1 = __importDefault(require("../db/database"));
const WhatsAppService_1 = require("./WhatsAppService");
class NotificationService {
    /**
     * Send a notification to a user (DB + External if needed)
     */
    static async send(userId, title, message, type = 'info', alertType) {
        try {
            // 1. Check Preferences if alertType is provided
            let shouldSendEmail = true;
            let shouldSendWhatsApp = false;
            let shouldSendSMS = false;
            if (alertType) {
                const settingsRes = await database_1.default.query('SELECT * FROM notification_settings WHERE user_id = $1 AND alert_type = $2', [userId, alertType]);
                if (settingsRes.rows.length > 0) {
                    const s = settingsRes.rows[0];
                    shouldSendEmail = s.channel_email;
                    shouldSendWhatsApp = s.channel_whatsapp;
                    shouldSendSMS = s.channel_sms;
                }
            }
            // 2. Save to DB (Always save to DB so user can see it in 'Notifications' tab)
            const result = await database_1.default.query(`INSERT INTO notifications (user_id, title, message, type) 
                 VALUES ($1, $2, $3, $4) RETURNING *`, [userId, title, message, type]);
            // 3. External Channels
            if (shouldSendWhatsApp) {
                // Get user phone
                const userRes = await database_1.default.query('SELECT phone FROM users WHERE id = $1', [userId]);
                if (userRes.rows[0]?.phone) {
                    await this.sendWhatsApp(userRes.rows[0].phone, `${title}: ${message}`);
                }
            }
            // 3. Simulate Real-time / External
            console.log(`[NOTIF] User ${userId} (Email: ${shouldSendEmail}, WA: ${shouldSendWhatsApp}): ${title} - ${message}`);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
    /**
     * Send a WhatsApp message via provider (Twilio/Meta) or Simulation
     */
    static async sendWhatsApp(phone, message) {
        return await WhatsAppService_1.WhatsAppService.send(phone, message);
    }
    /**
     * Mark notification as read
     */
    static async markAsRead(id) {
        await database_1.default.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    }
    /**
     * Mark all for user as read
     */
    static async markAllRead(userId) {
        await database_1.default.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map