import express, { Response } from 'express';
import { body } from 'express-validator';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { WhatsAppService } from '../services/WhatsAppService';
import EmailService from '../services/EmailService';
import { validate } from '../middleware/validate';

const router = express.Router();

// [SÉCURITÉ] Audit 2026-11-14, constat S5 : POST /api/messages permettait à tout
// compte connecté (locataire compris) d'envoyer un e-mail ou un WhatsApp, au nom de
// Hope, à N'IMPORTE QUEL recipient_id, avec un contenu HTML non échappé.
//
// La messagerie ne sert qu'au chat des tâches (ChatWindow, TasksPage). Règles :
//  - contexte obligatoire : une tâche existante (context_type = 'task') ;
//  - seuls ses participants (créateur, assigné) ou l'admin peuvent lire/écrire ;
//  - un destinataire, s'il est fourni, doit être un participant de la tâche ;
//  - le contenu est échappé avant d'être inséré dans le HTML de l'e-mail.
const SUPPORTED_CONTEXTS = ['task'];
const CHANNELS = ['internal', 'whatsapp', 'email', 'sms'];

// .trim().notEmpty() rejette aussi un contenu composé uniquement d'espaces.
const messageCreateRules = [
    body('content').trim().notEmpty().withMessage('Le contenu du message est requis').bail().isLength({ max: 5000 }).withMessage('Message trop long'),
    body('recipient_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('recipient_id invalide'),
    body('context_id').notEmpty().withMessage('context_id requis').bail().isInt({ min: 1 }).withMessage('context_id invalide'),
    body('context_type').isIn(SUPPORTED_CONTEXTS).withMessage('Contexte de message non pris en charge'),
    body('channel').optional({ nullable: true }).isIn(CHANNELS).withMessage('Canal invalide'),
];

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Participants d'une tâche (créateur + assigné), ou null si elle n'existe pas. */
async function taskParticipants(taskId: number | string): Promise<number[] | null> {
    const r = await pool.query(
        'SELECT created_by, assigned_to FROM tasks WHERE id = $1 AND deleted_at IS NULL',
        [taskId]
    );
    if (r.rows.length === 0) return null;
    const { created_by, assigned_to } = r.rows[0];
    return [created_by, assigned_to].filter((v: any) => v !== null && v !== undefined).map(Number);
}

// GET /api/messages?context_type=task&context_id=1
// Participants de la tâche (et admin) : toute la conversation. Avant, chacun ne voyait
// que ses propres messages (filtre sender/recipient alors que le chat de tâche n'a pas
// de destinataire) : l'autre participant ne voyait jamais les réponses.
// Autres : 403 (auparavant liste filtrée sur ses propres messages, donc vide en pratique).
router.get('/', protect, async (req: any, res) => {
    try {
        const { context_type, context_id } = req.query;

        if (!context_type || !context_id) {
            return res.status(400).json({ message: 'context_type et context_id sont requis.' });
        }
        if (!SUPPORTED_CONTEXTS.includes(String(context_type)) || !/^\d+$/.test(String(context_id))) {
            return res.status(400).json({ message: 'Contexte de message non pris en charge.' });
        }

        const participants = await taskParticipants(String(context_id));
        if (!participants) return res.status(404).json({ message: 'Tâche introuvable.' });
        if (req.userRole !== 'admin' && !participants.includes(Number(req.userId))) {
            return res.status(403).json({ message: 'Accès refusé à cette conversation.' });
        }

        const result = await pool.query(
            `SELECT m.*, u.nom as sender_name, u.email as sender_email
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.context_type = $1 AND m.context_id = $2
             AND m.deleted_at IS NULL
             ORDER BY m.created_at ASC`,
            [context_type, context_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement messages' });
    }
});

// POST /api/messages
// Enregistre le message en DB et l'envoie via le canal choisi (whatsapp, sms, email, internal).
router.post('/', protect, validate(messageCreateRules), async (req: any, res: Response) => {
    try {
        const { recipient_id, context_type, context_id, channel, content, attachments } = req.body;
        const sender_id = req.userId;
        const isAdmin = req.userRole === 'admin';

        // 0. Contrôle d'accès (audit S5)
        const participants = await taskParticipants(context_id);
        if (!participants) return res.status(404).json({ message: 'Tâche introuvable.' });
        if (!isAdmin && !participants.includes(Number(sender_id))) {
            return res.status(403).json({ message: 'Vous ne participez pas à cette tâche.' });
        }
        if (recipient_id && !participants.includes(Number(recipient_id))) {
            return res.status(403).json({ message: 'Le destinataire ne participe pas à cette tâche.' });
        }

        // 1. Sauvegarder en DB
        const result = await pool.query(
            `INSERT INTO messages (sender_id, recipient_id, context_type, context_id, channel, content, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [sender_id, recipient_id || null, context_type, context_id, channel || 'internal', content, JSON.stringify(attachments || [])]
        );

        // 2. Envoi externe selon le canal (best-effort — n'échoue pas la requête)
        if (recipient_id && channel && channel !== 'internal') {
            try {
                const recipientRes = await pool.query(
                    'SELECT id, email, telephone FROM users WHERE id = $1',
                    [recipient_id]
                );
                const recipient = recipientRes.rows[0];

                if (recipient) {
                    if (channel === 'whatsapp' && recipient.telephone) {
                        await WhatsAppService.send(recipient.telephone, content);
                    } else if (channel === 'email' && recipient.email) {
                        await EmailService.sendEmail(
                            recipient.email,
                            'Nouveau message — Hope Gestion',
                            content,
                            // Échappé : le contenu saisi ne doit jamais être interprété comme du HTML
                            `<p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p>`
                        );
                    } else if (channel === 'sms') {
                        // SMS via Twilio REST (à implémenter si besoin — placeholder)
                        console.log(`[SMS] → userId:${recipient.id} (canal sms)`);
                    }
                }
            } catch (sendError) {
                // On logue l'erreur d'envoi mais on ne fait pas échouer la réponse API
                console.error(`[MESSAGE] Erreur envoi ${channel}:`, sendError);
            }
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur envoi message' });
    }
});

export default router;
