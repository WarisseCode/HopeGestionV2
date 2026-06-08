// backend/routes/tenantAccessRoutes.ts
// Manages tenant portal access control

import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import crypto from 'crypto';

const router = express.Router();

// :tenantId est parseInt() côté handler — on le valide en amont pour éviter un NaN
// qui partirait en requête. Les champs de config sont optionnels mais typés.
const tenantIdParam = param('tenantId').isInt({ min: 1 }).withMessage('tenantId invalide');

const updateAccessRules = [
    tenantIdParam,
    body('access_modules').optional({ nullable: true }).isObject().withMessage('access_modules doit être un objet'),
    body('allow_online_payment').optional({ nullable: true }).isBoolean().withMessage('allow_online_payment doit être un booléen'),
    body('notification_channel').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Canal de notification invalide'),
];

// GET /api/tenant-access/:tenantId - Get access config
router.get('/:tenantId', protect, permissions.canRead('locataires'), tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const tenantId = parseInt(req.params.tenantId);

        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const result = await dbClient.query(
            'SELECT * FROM tenant_access WHERE tenant_id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) {
            // No access config yet, return defaults
            return res.json({
                tenant_id: tenantId,
                is_active: false,
                access_modules: { contrat: true, paiements: true, plaintes: true, services: false },
                allow_online_payment: false,
                notification_channel: 'whatsapp',
                access_code: null
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/tenant-access/:tenantId - Update access config
router.put('/:tenantId', protect, permissions.canWrite('locataires'), tenantGuard, validate(updateAccessRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const tenantId = parseInt(req.params.tenantId);

        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const { access_modules, allow_online_payment, notification_channel } = req.body;

        // Upsert access config
        const result = await dbClient.query(`
            INSERT INTO tenant_access (tenant_id, access_modules, allow_online_payment, notification_channel)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id) DO UPDATE SET
                access_modules = EXCLUDED.access_modules,
                allow_online_payment = EXCLUDED.allow_online_payment,
                notification_channel = EXCLUDED.notification_channel,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            tenantId,
            JSON.stringify(access_modules || { contrat: true, paiements: true, plaintes: true, services: false }),
            allow_online_payment || false,
            notification_channel || 'whatsapp'
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Configuration de locataire non trouvée ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tenant-access/:tenantId/activate - Activate tenant access and generate code
router.post('/:tenantId/activate', protect, permissions.canWrite('locataires'), tenantGuard, validate([tenantIdParam]), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const tenantId = parseInt(req.params.tenantId);

        // [RLS] Isolation garantie par PostgreSQL Row-Level Security

        // Generate unique access code
        const accessCode = crypto.randomBytes(16).toString('hex');

        const result = await dbClient.query(`
            INSERT INTO tenant_access (tenant_id, is_active, access_code)
            VALUES ($1, TRUE, $2)
            ON CONFLICT (tenant_id) DO UPDATE SET
                is_active = TRUE,
                access_code = EXCLUDED.access_code,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [tenantId, accessCode]);

        if (result.rowCount === 0) {
             return res.status(404).json({ message: 'Locataire inexistant ou accès refusé' });
        }

        res.json({
            message: 'Accès activé',
            access_code: accessCode,
            access: result.rows[0]
        });
    } catch (error) {
        console.error('Error activating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tenant-access/:tenantId/suspend - Suspend tenant access
router.post('/:tenantId/suspend', protect, permissions.canWrite('locataires'), tenantGuard, validate([tenantIdParam]), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const tenantId = parseInt(req.params.tenantId);

        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const result = await dbClient.query(`
            UPDATE tenant_access SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $1
            RETURNING tenant_id
        `, [tenantId]);

        if (result.rowCount === 0) {
             return res.status(404).json({ message: 'Locataire inexistant ou accès refusé' });
        }

        res.json({ message: 'Accès suspendu' });
    } catch (error) {
        console.error('Error suspending tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — tenantAccessRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool totalement supprimé grâce au commentaire d'avertissement.
 * ✅ Fonctions d'accès manuelles getManagedOwnerId et verifyTenantAccess SUPPRIMÉES (Obsolètes).
 * ✅ Chaque ancien appel manuel remplacé par : // [RLS] Isolation garantie par PostgreSQL Row-Level Security.
 * ✅ tenantGuard greffé formellement après chaque authMiddleware et validation des permissions existantes.
 * ✅ Remplacement strict de pool.query() par req.dbClient.query().
 * ✅ Traitement explicite de la restriction dynamique RLS via vérification de result.rowCount === 0 propulsant un statut 404 là où indiqué.
 * ═══════════════════════════════════════════════════
 */

export default router;
