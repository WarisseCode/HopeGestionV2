"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const WhatsAppService_1 = require("../services/WhatsAppService");
const EmailService_1 = __importDefault(require("../services/EmailService"));
const router = express_1.default.Router();
// GET /api/messages?context_type=task&context_id=1
// [SÉCURITÉ] Filtre sender_id/recipient_id = req.userId — empêche l'IDOR via context_id
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const { context_type, context_id } = req.query;
        if (!context_type || !context_id) {
            return res.status(400).json({ message: 'context_type et context_id sont requis.' });
        }
        const result = await database_1.default.query(`SELECT m.*, u.nom as sender_name, u.email as sender_email
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.context_type = $1 AND m.context_id = $2
             AND (m.sender_id = $3 OR m.recipient_id = $3)
             ORDER BY m.created_at ASC`, [context_type, context_id, req.userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement messages' });
    }
});
// POST /api/messages
// Enregistre le message en DB et l'envoie via le canal choisi (whatsapp, sms, email, internal).
router.post('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const { recipient_id, context_type, context_id, channel, content, attachments } = req.body;
        const sender_id = req.userId;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Le contenu du message est requis.' });
        }
        // 1. Sauvegarder en DB
        const result = await database_1.default.query(`INSERT INTO messages (sender_id, recipient_id, context_type, context_id, channel, content, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [sender_id, recipient_id, context_type, context_id, channel || 'internal', content, JSON.stringify(attachments || [])]);
        // 2. Envoi externe selon le canal (best-effort — n'échoue pas la requête)
        if (recipient_id && channel && channel !== 'internal') {
            try {
                const recipientRes = await database_1.default.query('SELECT email, telephone FROM users WHERE id = $1', [recipient_id]);
                const recipient = recipientRes.rows[0];
                if (recipient) {
                    if (channel === 'whatsapp' && recipient.telephone) {
                        await WhatsAppService_1.WhatsAppService.send(recipient.telephone, content);
                    }
                    else if (channel === 'email' && recipient.email) {
                        await EmailService_1.default.sendEmail(recipient.email, 'Nouveau message — Hope Gestion', content, `<p>${content.replace(/\n/g, '<br/>')}</p>`);
                    }
                    else if (channel === 'sms') {
                        // SMS via Twilio REST (à implémenter si besoin — placeholder)
                        console.log(`[SMS] → ${recipient.telephone}: ${content}`);
                    }
                }
            }
            catch (sendError) {
                // On logue l'erreur d'envoi mais on ne fait pas échouer la réponse API
                console.error(`[MESSAGE] Erreur envoi ${channel}:`, sendError);
            }
        }
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur envoi message' });
    }
});
exports.default = router;
