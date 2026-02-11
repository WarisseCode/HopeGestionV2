"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationService_1 = require("../services/notificationService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = __importDefault(require("../db/database"));
const router = express_1.default.Router();
// GET /api/notifications - List all notifications for current user
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ message: 'Non authentifié' });
        const result = await database_1.default.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
        // Count unread
        const countRes = await database_1.default.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
        res.json({
            notifications: result.rows,
            unreadCount: parseInt(countRes.rows[0].count)
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', authMiddleware_1.protect, async (req, res) => {
    try {
        await notificationService_1.NotificationService.markAsRead(parseInt(req.params.id || '0'));
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authMiddleware_1.protect, async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: 'Non authentifié' });
        await notificationService_1.NotificationService.markAllRead(req.userId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/notifications/test - Trigger a test notification (Demo purpose)
router.post('/test', authMiddleware_1.protect, async (req, res) => {
    try {
        const { type, message } = req.body;
        await notificationService_1.NotificationService.send(req.userId, 'Notification Test', message || 'Ceci est une notification de test générée manuellement.', type || 'info');
        // Simulate WhatsApp too if requested
        if (req.body.whatsapp) {
            await notificationService_1.NotificationService.sendWhatsApp('+22900000000', message || 'Test WhatsApp');
        }
        res.json({ success: true, message: 'Notification envoyée' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/notifications/settings - Fetch user settings
router.get('/settings', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ message: 'Non authentifié' });
        const result = await database_1.default.query('SELECT * FROM notification_settings WHERE user_id = $1', [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/notifications/settings - Update or create settings
router.put('/settings', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.userId;
        const { settings } = req.body; // Array of { alert_type, channel_email, channel_whatsapp, channel_sms }
        if (!userId)
            return res.status(401).json({ message: 'Non authentifié' });
        for (const s of settings) {
            await database_1.default.query(`INSERT INTO notification_settings (user_id, alert_type, channel_email, channel_whatsapp, channel_sms, updated_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                 ON CONFLICT (user_id, alert_type) DO UPDATE SET
                 channel_email = EXCLUDED.channel_email,
                 channel_whatsapp = EXCLUDED.channel_whatsapp,
                 channel_sms = EXCLUDED.channel_sms,
                 updated_at = EXCLUDED.updated_at`, [userId, s.alert_type, s.channel_email, s.channel_whatsapp, s.channel_sms]);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
