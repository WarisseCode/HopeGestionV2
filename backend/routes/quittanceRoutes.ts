// backend/routes/quittanceRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard.
// Isolation multi-tenant par filtrage owner explicite (manual_quittances n'a pas de policy RLS).

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';

const router = Router();

// Propriétaires gérés : resolvedOwnerId (owner unique) sinon validOwnerIds (multi-owner, où
// resolvedOwnerId = null). Filtrer par cette liste évite les requêtes "owner_id = NULL".
function getEffectiveOwnerIds(req: AuthenticatedRequest): number[] {
    const ownerId = (req as any).resolvedOwnerId;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    return ownerId != null ? [ownerId] : validOwnerIds;
}

// lease_id obligatoire : il rattache la quittance à un bail réel et sert à dériver l'owner.
const createRules = [
    body('lease_id').notEmpty().withMessage('lease_id est obligatoire').bail().isInt({ min: 1 }).withMessage('lease_id invalide'),
    body('montant').notEmpty().withMessage('Le montant est obligatoire').bail().isFloat({ gt: 0 }).withMessage('Montant invalide (> 0)'),
    body('periode').notEmpty().withMessage('La période est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('Période invalide'),
    body('locataire').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Locataire invalide'),
    body('bien').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Bien invalide'),
    body('date_emission').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
];

// GET /api/quittances - Liste des quittances manuelles (owner-scopées)
router.get('/', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        if (effectiveOwnerIds.length === 0) return res.json([]);
        const result = await dbClient.query(
            `SELECT * FROM manual_quittances WHERE owner_id = ANY($1::int[]) ORDER BY created_at DESC`,
            [effectiveOwnerIds]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching manual quittances:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/quittances - Enregistrer une quittance manuelle
router.post('/', permissions.canWrite('finance'), tenantGuard, validate(createRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        if (effectiveOwnerIds.length === 0) {
            return res.status(403).json({ message: 'Aucun propriétaire associé à ce compte.' });
        }
        const { lease_id, locataire, bien, periode, montant, date_emission } = req.body;

        // [SÉCURITÉ] Vérifie l'appartenance du bail à l'un des owners gérés ET dérive l'owner réel.
        const leaseRes = await dbClient.query(
            'SELECT owner_id FROM leases WHERE id = $1 AND owner_id = ANY($2::int[])',
            [lease_id, effectiveOwnerIds]
        );
        if (leaseRes.rows.length === 0) {
            return res.status(404).json({ message: 'Bail introuvable ou accès refusé' });
        }
        const ownerId = leaseRes.rows[0].owner_id;

        const emission = date_emission || new Date();
        const year = new Date(emission).getFullYear();

        // Numéro lisible dérivé de l'id (séquentiel) → on insère puis on fixe le numéro.
        await dbClient.query('BEGIN');
        try {
            const ins = await dbClient.query(
                `INSERT INTO manual_quittances
                    (owner_id, lease_id, locataire_name, bien, periode, montant, date_emission, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [ownerId, lease_id, locataire || '', bien || '', periode, montant, emission, req.userId || null]
            );
            const id = ins.rows[0].id;
            const numero = `QUI-MAN-${year}-${String(id).padStart(4, '0')}`;
            const upd = await dbClient.query(
                'UPDATE manual_quittances SET numero = $1 WHERE id = $2 RETURNING *',
                [numero, id]
            );
            await dbClient.query('COMMIT');
            res.status(201).json(upd.rows[0]);
        } catch (txErr) {
            await dbClient.query('ROLLBACK');
            throw txErr;
        }
    } catch (error) {
        console.error('Error creating manual quittance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
