import express, { Response } from 'express';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { parsePagination, paginate } from '../utils/pagination';

const router = express.Router();

// Protect all routes with auth check and RLS context
router.use(protect);
router.use(tenantGuard);

// [RLS] Prestataires globaux supprimés.
// Tout prestataire appartient à un owner via RLS.
/**
 * @swagger
 * /providers:
 *   get:
 *     tags: [Providers]
 *     summary: Lister les prestataires
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *         description: Filtrer par spécialité (ex. plomberie, électricité)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Liste paginée de prestataires
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Provider'
 *   post:
 *     tags: [Providers]
 *     summary: Créer un prestataire
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Provider'
 *     responses:
 *       201:
 *         description: Prestataire créé
 */
// GET /api/providers?page=1&limit=20&specialty=&status=
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const pg = parsePagination(req.query as any);
        const { specialty, status } = req.query as any;

        let where = 'WHERE 1=1';
        const params: any[] = [];
        let paramId = 1;

        if (specialty) { where += ` AND specialty = $${paramId++}`; params.push(specialty); }
        if (status)    { where += ` AND status = $${paramId++}`;    params.push(status); }

        const countResult = await dbClient.query(`SELECT COUNT(*) FROM providers ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await dbClient.query(
            `SELECT * FROM providers ${where} ORDER BY name ASC LIMIT $${paramId++} OFFSET $${paramId++}`,
            [...params, pg.limit, pg.offset]
        );

        res.json(paginate(dataResult.rows, total, pg));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement prestataires' });
    }
});

// POST /api/providers
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const resolvedOwnerId = (req as any).resolvedOwnerId;
        const { name, specialty, contact_name, phone, email, address } = req.body;

        const result = await dbClient.query(
            `INSERT INTO providers (owner_id, name, specialty, contact_name, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [resolvedOwnerId, name, specialty, contact_name, phone, email, address]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création prestataire' });
    }
});

// PUT /api/providers/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { name, specialty, contact_name, phone, email, address, status } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
            `UPDATE providers SET name=$1, specialty=$2, contact_name=$3, phone=$4, email=$5, address=$6, status=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`,
            [name, specialty, contact_name, phone, email, address, status, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Prestataire introuvable ou accès refusé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification' });
    }
});

// DELETE /api/providers/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const result = await dbClient.query('DELETE FROM providers WHERE id = $1 RETURNING id', [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Prestataire introuvable ou accès refusé' });
        }
        res.json({ message: 'Prestataire supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — providerRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Utilisation exclusive de req.dbClient à la place de pool.query.
 * ✅ Application globale de protect et tenantGuard en haut de fichier via router.use().
 * ✅ Suppression du IS NULL : les prestataires globaux sont radiés (tout prestataire requiert un owner).
 * ✅ getManagedOwnerId supprimé.
 * ✅ Injection sécurisée de owner_id = resolvedOwnerId dans l'INSERT de la table providers.
 * ✅ Blocages IDOR stricts : 404 retourné si les requêtes UPDATE/DELETE retournent rowCount === 0.
 * ✅ La table providers vient d'être couverte par migration_rls.sql.
 * ═══════════════════════════════════════════════════
 */

export default router;
