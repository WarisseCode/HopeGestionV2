import express, { Response } from 'express';
import { body, param } from 'express-validator';
// Exception documentée — pool autorisé UNIQUEMENT pour les
// routes locataires sans owner_id ou routes mixtes résolvant en aval le owner_id.
// Pour le reste, (routes gestionnaires), utiliser absolument req.dbClient
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import { parsePagination, paginate } from '../utils/pagination';

const router = express.Router();

const ticketIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide');
const ticketCreateRules = [
    body('lot_id').notEmpty().withMessage("L'ID du lot est requis").bail().isInt({ min: 1 }).withMessage('lot_id invalide'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Type invalide'),
    body('category').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Catégorie invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Description trop longue'),
    body('priorite').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Priorité invalide'),
    body('urgency').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Urgence invalide'),
    body('requester_name').optional({ nullable: true }).isString().isLength({ max: 150 }).withMessage('Nom invalide'),
    body('requester_phone').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('Téléphone invalide'),
    body('photos_before').optional({ nullable: true }).isArray().withMessage('photos_before doit être un tableau'),
];
const ticketUpdateRules = [
    ticketIdParam,
    body('provider_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('provider_id invalide'),
    body('scheduled_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Date invalide'),
    body('statut').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Statut invalide'),
    body('cost_estimated').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Coût invalide'),
];
const ticketRescheduleRules = [
    ticketIdParam,
    body('new_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Date invalide'),
    body('reason').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Motif trop long'),
];
const ticketCloseRules = [
    ticketIdParam,
    body('cost_real').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Coût invalide'),
    body('photos_after').optional({ nullable: true }).isArray().withMessage('photos_after doit être un tableau'),
    body('comments').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaire trop long'),
    body('actions_done').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Actions trop longues'),
];

// GET /api/tickets?page=1&limit=20&statut=&priorite=&category=
router.get('/', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const { statut, priorite, category } = req.query;
        const pg = parsePagination(req.query);

        const joins = `
            FROM tickets t
            LEFT JOIN lots l ON t.lot_id = l.id
            LEFT JOIN buildings b ON l.building_id = b.id
            LEFT JOIN providers p ON t.provider_id = p.id
            LEFT JOIN leases le ON l.id = le.lot_id AND le.statut = 'actif'
            LEFT JOIN tenants tn ON le.tenant_id = tn.id
        `;

        let where = 'WHERE 1=1 AND t.deleted_at IS NULL';
        const params: any[] = [];
        let paramIndex = 1;

        if (statut)   { where += ` AND t.statut = $${paramIndex++}`;    params.push(statut); }
        if (priorite) { where += ` AND t.priorite = $${paramIndex++}`;  params.push(priorite); }
        if (category) { where += ` AND t.category = $${paramIndex++}`;  params.push(category); }

        const countResult = await dbClient.query(`SELECT COUNT(*) ${joins} ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await dbClient.query(
            `SELECT t.*,
                    l.ref_lot, b.nom as building_name,
                    p.name as provider_name,
                    tn.nom as tenant_name, tn.prenoms as tenant_surname
             ${joins} ${where}
             ORDER BY t.date_creation DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, pg.limit, pg.offset]
        );

        res.json(paginate(dataResult.rows, total, pg));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tickets' });
    }
});

// [LOCATAIRE] Route appelée par le locataire connecté.
// tenantGuard non applicable : le locataire n'a pas d'owner_id.
// Isolation garantie par filtrage strict sur req.userId (JWT).
// pool.query autorisé ici par exception documentée.
// GET /api/tickets/tenant - Tickets for current tenant
router.get('/tenant', protect, async (req: any, res) => {
    try {
        const userId = req.userId;
        
        // Find tenant linked to this user (filtered solely by JWT user_id)
        const tenantResult = await pool.query(
            `SELECT t.id FROM tenants t WHERE t.user_id = $1`,
            [userId]
        );
        
        if (tenantResult.rows.length === 0) {
            return res.json([]);
        }
        
        const tenantId = tenantResult.rows[0].id;
        
        // Get tickets for lots where this tenant has an active lease
        const result = await pool.query(
            `SELECT t.*, l.ref_lot, b.nom as building_name, p.name as provider_name
             FROM tickets t
             JOIN lots l ON t.lot_id = l.id
             JOIN buildings b ON l.building_id = b.id
             LEFT JOIN providers p ON t.provider_id = p.id
             JOIN leases le ON l.id = le.lot_id AND le.tenant_id = $1 AND le.statut = 'actif'
             ORDER BY t.date_creation DESC`,
            [tenantId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tickets locataire' });
    }
});

// [MIXTE] Route appelée par locataire ou gestionnaire.
// tenantGuard non applicable : l'owner_id est déduit du lot_id.
// Sécurité : owner_id jamais fourni par le client — 
// toujours résolu depuis la DB via lot_id.
// POST /api/tickets
router.post('/', protect, validate(ticketCreateRules), async (req: any, res: Response) => {
    try {
        const { lot_id, type, category, description, priorite, urgency, photos_before, requester_name, requester_phone } = req.body;
        const lotIdValue = parseInt(lot_id, 10);

        const lotRes = await pool.query(
            'SELECT owner_id FROM lots WHERE id = $1',
            [lotIdValue]
        );
        if (lotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable' });
        }
        const deducedOwnerId = lotRes.rows[0].owner_id;
        
        const result = await pool.query(
            `INSERT INTO tickets (lot_id, titre, category, description, priorite, urgency, photos_before, requester_name, requester_phone, statut, date_creation, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Ouvert', NOW(), $10) RETURNING *`,
            [lotIdValue, type, category, description, priorite, urgency || priorite, JSON.stringify(photos_before || []), requester_name, requester_phone, deducedOwnerId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création ticket' });
    }
});

// PUT /api/tickets/:id (Assign/Update) (Gestionnaire)
router.put('/:id', protect, tenantGuard, validate(ticketUpdateRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { provider_id, scheduled_date, statut, cost_estimated } = req.body;
        const id = req.params.id;

        if (provider_id) {
             const result = await dbClient.query(
                `UPDATE tickets SET provider_id=$1, scheduled_date=$2, cost_estimated=$3, statut=$4, updated_at=NOW()
                 WHERE id=$5 RETURNING *`,
                [provider_id, scheduled_date, cost_estimated, statut || 'En cours', id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
            }
            res.json(result.rows[0]);
        } else {
            const result = await dbClient.query(
                `UPDATE tickets SET statut=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
                [statut, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
            }
            res.json(result.rows[0]);
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur modification ticket' });
    }
});

// POST /api/tickets/:id/reschedule (Gestionnaire)
router.post('/:id/reschedule', protect, tenantGuard, validate(ticketRescheduleRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { new_date, reason } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
            `UPDATE tickets SET 
                scheduled_date = $1, 
                statut = 'En attente',
                description = description || '\n[Reprogrammé]: ' || $2,
                updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [new_date, reason || 'Reprogrammé', id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur reprogrammation' });
    }
});

// POST /api/tickets/:id/close (Gestionnaire)
router.post('/:id/close', protect, tenantGuard, validate(ticketCloseRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { cost_real, photos_after, comments, actions_done } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
            `UPDATE tickets SET 
                statut='Clos', 
                cost_real=$1, 
                photos_after=$2, 
                description = description || '\n[Clôture - Actions]: ' || $3 || '\n[Commentaire]: ' || $4,
                date_resolution=NOW(),
                updated_at=NOW()
             WHERE id=$5 RETURNING *`,
            [cost_real, JSON.stringify(photos_after || []), actions_done || '', comments || '', id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur clôture ticket' });
    }
});

// DELETE /api/tickets/:id (Gestionnaire) — soft-delete vers la corbeille.
// Filtrage owner explicite (tickets.owner_id) + admin voit tout.
router.delete('/:id', protect, tenantGuard, validate([ticketIdParam]), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const isAdmin = (req as any).userRole === 'admin';
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];
        const params: any[] = [req.params.id, req.userId];
        let ownerClause = '';
        if (!isAdmin) {
            params.push(validOwnerIds);
            ownerClause = ` AND owner_id = ANY($3::int[])`;
        }
        const result = await dbClient.query(
            `UPDATE tickets SET deleted_at = NOW(), deleted_by = $2
             WHERE id = $1 AND deleted_at IS NULL${ownerClause} RETURNING id`,
            params
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Intervention introuvable ou accès refusé' });
        }
        res.json({ message: 'Intervention déplacée vers la corbeille' });
    } catch (error) {
        console.error('Erreur suppression ticket:', error);
        res.status(500).json({ message: 'Erreur suppression intervention' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — ticketRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Exception Locataire (GET /tenant) documentée et gérée de manière isolée via req.userId.
 * ✅ Exception Mixte (POST /) documentée et sécurisée par la déduction intra-base du owner_id via le lot_id.
 * ✅ tenantGuard assigné strictement aux routes 100% Gestionnaires (GET /, PUT, POST close/reschedule).
 * ✅ L'helper getManagedOwnerId supprimé et remplacé par l'automatisation RLS.
 * ✅ UPDATE bloquant RLS complété avec des throw error 404 (rowCount === 0 explicit refus).
 * ═══════════════════════════════════════════════════
 */

export default router;
