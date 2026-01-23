import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/messages?context_type=task&context_id=1
router.get('/', protect, async (req: any, res) => {
    try {
        const { context_type, context_id } = req.query;

        if (!context_type || !context_id) {
            return res.status(400).json({ message: 'Context required' });
        }

        const result = await pool.query(
            `SELECT m.*, u.nom as sender_name, u.email as sender_email
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.context_type = $1 AND m.context_id = $2
             ORDER BY m.created_at ASC`,
            [context_type, context_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement messages' });
    }
});

// POST /api/messages (Send message)
router.post('/', protect, async (req: any, res) => {
    try {
        const { recipient_id, context_type, context_id, channel, content, attachments } = req.body;
        const sender_id = req.user.id;

        // Save to DB
        const result = await pool.query(
            `INSERT INTO messages (sender_id, recipient_id, context_type, context_id, channel, content, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [sender_id, recipient_id, context_type, context_id, channel || 'internal', content, JSON.stringify(attachments || [])]
        );

        // Simulation of external sending
        if (channel === 'whatsapp') {
            console.log(`[WHATSAPP] Sending to user ${recipient_id}: ${content}`);
        } else if (channel === 'sms') {
            console.log(`[SMS] Sending to user ${recipient_id}: ${content}`);
        } else if (channel === 'email') {
             console.log(`[EMAIL] Sending to user ${recipient_id}: ${content}`);
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur envoi message' });
    }
});

export default router;
