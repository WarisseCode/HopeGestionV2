
import express from 'express';
import { NotificationService } from '../services/notificationService';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { pool } from '../index';

const router = express.Router();

// GET /api/notifications - List all notifications for current user
router.get('/', protect, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId as any]
        );
        
        // Count unread
        const countRes = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId as any]
        );

        res.json({
            notifications: result.rows,
            unreadCount: parseInt(countRes.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', protect, async (req: AuthenticatedRequest, res) => {
    try {
        await NotificationService.markAsRead(parseInt(req.params.id || '0'));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', protect, async (req: AuthenticatedRequest, res) => {
    try {
        if (!req.userId) return res.status(401).json({ message: 'Non authentifié' });
        await NotificationService.markAllRead(req.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/notifications/test - Trigger a test notification (Demo purpose)
router.post('/test', protect, async (req: AuthenticatedRequest, res) => {
    try {
        const { type, message } = req.body;
        await NotificationService.send(
            req.userId!, 
            'Notification Test', 
            message || 'Ceci est une notification de test générée manuellement.',
            type || 'info'
        );
        
        // Simulate WhatsApp too if requested
        if (req.body.whatsapp) {
            await NotificationService.sendWhatsApp('+22900000000', message || 'Test WhatsApp');
        }

        res.json({ success: true, message: 'Notification envoyée' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/notifications/trigger-automation - Manual Trigger for Cron Jobs
import { CronService } from '../services/CronService';
router.post('/trigger-automation', async (req: AuthenticatedRequest, res) => {
    try {
        console.log('⚡ Manually triggering automation jobs...');
        
        // Force check late payments (bypass date check)
        await CronService.checkLatePayments(true);
        
        // Check lease expirations
        await CronService.checkLeaseExpirations();
        
        res.json({ message: "Automation jobs triggered successfully." });
    } catch (error) {
        console.error('Error triggering automation:', error);
        res.status(500).json({ message: "Error triggering automation" });
    }
});

export default router;
