"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// GET /api/messages?context_type=task&context_id=1
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const { context_type, context_id } = req.query;
        if (!context_type || !context_id) {
            return res.status(400).json({ message: 'Context required' });
        }
        const result = await database_1.default.query(`SELECT m.*, u.nom as sender_name, u.email as sender_email
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.context_type = $1 AND m.context_id = $2
             ORDER BY m.created_at ASC`, [context_type, context_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement messages' });
    }
});
// POST /api/messages (Send message)
router.post('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const { recipient_id, context_type, context_id, channel, content, attachments } = req.body;
        const sender_id = req.user.id;
        // Save to DB
        const result = await database_1.default.query(`INSERT INTO messages (sender_id, recipient_id, context_type, context_id, channel, content, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [sender_id, recipient_id, context_type, context_id, channel || 'internal', content, JSON.stringify(attachments || [])]);
        // Simulation of external sending
        if (channel === 'whatsapp') {
            console.log(`[WHATSAPP] Sending to user ${recipient_id}: ${content}`);
        }
        else if (channel === 'sms') {
            console.log(`[SMS] Sending to user ${recipient_id}: ${content}`);
        }
        else if (channel === 'email') {
            console.log(`[EMAIL] Sending to user ${recipient_id}: ${content}`);
        }
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur envoi message' });
    }
});
exports.default = router;
