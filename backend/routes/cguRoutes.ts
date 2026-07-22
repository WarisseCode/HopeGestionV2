// backend/routes/cguRoutes.ts
// Gestion du consentement aux CGU : version en vigueur (publique), statut d'acceptation et
// enregistrement de l'acceptation pour l'utilisateur connecté. L'application du consentement
// (bloquer l'accès tant que non accepté) est faite côté frontend par CguGate.tsx, qui encadre
// toutes les routes authentifiées — ça couvre uniformément l'inscription directe, l'acceptation
// d'invitation, Google OAuth et les comptes déjà existants, sans dupliquer la logique de
// consentement à chaque point d'entrée de création de compte.
import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { CGU_CURRENT_VERSION } from '../config/config';
import pool from '../db/database';

const router = Router();

const acceptRules = [
    body('version').notEmpty().withMessage('version requise').bail().isString().isLength({ max: 20 }).withMessage('version invalide'),
];

// GET /api/cgu/version - Version en vigueur (public, utilisé par la page CGU et avant connexion).
router.get('/version', (req, res: Response) => {
    res.json({ version: CGU_CURRENT_VERSION });
});

// GET /api/cgu/status - L'utilisateur connecté a-t-il accepté la version en vigueur ?
router.get('/status', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT version FROM cgu_acceptances WHERE user_id = $1 ORDER BY accepted_at DESC LIMIT 1`,
            [req.user?.id]
        );
        const lastVersion = result.rows[0]?.version;
        res.json({ accepted: lastVersion === CGU_CURRENT_VERSION, currentVersion: CGU_CURRENT_VERSION });
    } catch (error) {
        console.error('Error checking CGU status:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/cgu/accept - Enregistre l'acceptation de la version en vigueur par l'utilisateur connecté.
router.post('/accept', protect, validate(acceptRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { version } = req.body;
        if (version !== CGU_CURRENT_VERSION) {
            return res.status(409).json({ message: 'Version des CGU obsolète, veuillez recharger la page.' });
        }
        await pool.query(
            `INSERT INTO cgu_acceptances (user_id, version, ip_address, user_agent) VALUES ($1, $2, $3, $4)`,
            [req.user?.id, version, req.ip || 'unknown', (req.headers['user-agent'] as string) || 'unknown']
        );
        res.status(201).json({ message: 'CGU acceptées.', version });
    } catch (error) {
        console.error('Error recording CGU acceptance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
