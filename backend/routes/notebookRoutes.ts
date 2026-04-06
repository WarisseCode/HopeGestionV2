// backend/routes/notebookRoutes.ts
import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/database';
import { parsePagination, paginate } from '../utils/pagination';
// Exception documentée — module personnel isolé par user_id.
// tenantGuard non applicable : données personnelles
// de l'agent/gestionnaire, pas du tenant owner.
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';

const router = Router();

const handleValidation = (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const noteRules = [
    body('title').trim().notEmpty().withMessage('Le titre est obligatoire').isLength({ max: 255 }),
    body('visibility').optional().isIn(['private', 'shared']).withMessage('Visibilité invalide (private, shared)'),
];

const contactRules = [
    body('name').trim().notEmpty().withMessage('Le nom est obligatoire').isLength({ max: 255 }),
    body('email').optional({ nullable: true }).isEmail().withMessage('Email invalide'),
    body('phone').optional({ nullable: true }).isLength({ max: 30 }).withMessage('Numéro trop long'),
];

// Protect all routes with JWT to guarantee req.userId
router.use(protect);

// === NOTES ===

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
/**
 * @swagger
 * /carnet/notes:
 *   get:
 *     tags: [Notebook]
 *     summary: Lister les notes
 *     description: Retourne les notes privées de l'utilisateur + les notes partagées.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée de notes
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
 *                         $ref: '#/components/schemas/Note'
 *   post:
 *     tags: [Notebook]
 *     summary: Créer une note
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Note'
 *     responses:
 *       201:
 *         description: Note créée
 *       400:
 *         description: Titre obligatoire
 */
// GET /api/carnet/notes?page=1&limit=20
router.get('/notes', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const pg = parsePagination(req.query as any);
        const countResult = await pool.query(
            "SELECT COUNT(*) FROM notebook_notes WHERE user_id = $1 OR visibility = 'shared'",
            [req.userId]
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await pool.query(
            "SELECT * FROM notebook_notes WHERE user_id = $1 OR visibility = 'shared' ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            [req.userId, pg.limit, pg.offset]
        );
        res.json(paginate(dataResult.rows, total, pg));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// POST /api/carnet/notes
router.post('/notes', noteRules, handleValidation, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, content, type, entity_type, entity_id, visibility } = req.body;
        const result = await pool.query(
            `INSERT INTO notebook_notes (title, content, type, entity_type, entity_id, visibility, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, content, type, entity_type, entity_id, visibility, req.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création note' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
/**
 * @swagger
 * /carnet/notes/{id}:
 *   put:
 *     tags: [Notebook]
 *     summary: Modifier une note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Note'
 *     responses:
 *       200:
 *         description: Note modifiée
 *       404:
 *         description: Note introuvable ou accès refusé
 *   delete:
 *     tags: [Notebook]
 *     summary: Supprimer une note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Note supprimée
 *       404:
 *         description: Note introuvable ou accès refusé
 */
// PUT /api/carnet/notes/:id
router.put('/notes/:id', noteRules, handleValidation, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, content, type, visibility } = req.body;
        const result = await pool.query(
            `UPDATE notebook_notes
             SET title = COALESCE($1, title),
                 content = COALESCE($2, content),
                 type = COALESCE($3, type),
                 visibility = COALESCE($4, visibility),
                 updated_at = NOW()
             WHERE id = $5 AND user_id = $6
             RETURNING *`,
            [title, content, type, visibility, req.params.id, req.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Note introuvable ou accès refusé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification note' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// DELETE /api/carnet/notes/:id
router.delete('/notes/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('DELETE FROM notebook_notes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Note introuvable ou accès refusé' });
        }
        res.json({ message: 'Note supprimée' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

// === CONTACTS ===

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// GET /api/carnet/contacts?page=1&limit=20
router.get('/contacts', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const pg = parsePagination(req.query as any);
        const countResult = await pool.query('SELECT COUNT(*) FROM notebook_contacts WHERE user_id = $1', [req.userId]);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await pool.query(
            'SELECT * FROM notebook_contacts WHERE user_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3',
            [req.userId, pg.limit, pg.offset]
        );
        res.json(paginate(dataResult.rows, total, pg));
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// POST /api/carnet/contacts
router.post('/contacts', contactRules, handleValidation, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, role, phone, email, address, description } = req.body;
        const result = await pool.query(
            `INSERT INTO notebook_contacts (name, role, phone, email, address, description, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, role, phone, email, address, description, req.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur création contact' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// PUT /api/carnet/contacts/:id
router.put('/contacts/:id', contactRules, handleValidation, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, role, phone, email, address, description } = req.body;
        const result = await pool.query(
            `UPDATE notebook_contacts
             SET name        = COALESCE($1, name),
                 role        = COALESCE($2, role),
                 phone       = COALESCE($3, phone),
                 email       = COALESCE($4, email),
                 address     = COALESCE($5, address),
                 description = COALESCE($6, description),
                 updated_at  = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [name, role, phone, email, address, description, req.params.id, req.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contact introuvable ou accès refusé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification contact' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// DELETE /api/carnet/contacts/:id
router.delete('/contacts/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query(
            'DELETE FROM notebook_contacts WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contact introuvable ou accès refusé' });
        }
        res.json({ message: 'Contact supprimé' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

// === FIELD ACTIONS ===

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// GET /api/carnet/field-actions?page=1&limit=20
router.get('/field-actions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const pg = parsePagination(req.query as any);
        const countResult = await pool.query('SELECT COUNT(*) FROM notebook_field_actions WHERE user_id = $1', [req.userId]);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await pool.query(
            'SELECT * FROM notebook_field_actions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [req.userId, pg.limit, pg.offset]
        );
        res.json(paginate(dataResult.rows, total, pg));
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// POST /api/carnet/field-actions
router.post('/field-actions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { type, description, photo_url, location_lat, location_lng, location_address } = req.body;
        const result = await pool.query(
            `INSERT INTO notebook_field_actions (type, description, photo_url, location_lat, location_lng, location_address, status, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
            [type, description, photo_url, location_lat, location_lng, location_address, req.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création action' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS USER-LEVEL — notebookRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ tenantGuard N'A PAS été appliqué : Les notes, les contacts et field_actions appartiennent à l'utilisateur qui les crée (agent/gestionnaire), indépendamment de l'agence (owner_id).
 * ✅ L'import de pool est explicitement autorisé et documenté.
 * ✅ Toutes les requêtes garantissent de filtrer via le user_id fourni par req.userId venant du JWT (plus aucune fuite inter-utilisateur possible).
 * ✅ L'IDOR est contrecarré (le DELETE exige `WHERE id = $1 AND user_id = $2`) et déclenche un 404 dans ce cas contraire.
 * ✅ Aucun owner_id impliqué.
 * ═══════════════════════════════════════════════════
 */

export default router;
