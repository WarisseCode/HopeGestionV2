import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';

const router = express.Router();

// edl_inspections.id et edl_items.id sont SERIAL (int) — cf. migration 049.
const edlIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant EDL invalide');

const edlCreateRules = [
    body('lot_id').notEmpty().withMessage('lot_id est obligatoire').bail().isInt({ min: 1 }).withMessage('lot_id invalide'),
    body('type_edl').notEmpty().withMessage('type_edl est obligatoire').bail().isString().isLength({ max: 30 }).withMessage('type_edl invalide'),
    body('date_realisation').optional({ nullable: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('location_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('location_id invalide'),
    body('locataire_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('locataire_id invalide'),
    body('locataire_name').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Nom locataire invalide'),
    body('locataire_present').optional({ nullable: true }).isBoolean().withMessage('locataire_present doit être un booléen'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
    body('parent_edl_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('parent_edl_id invalide'),
];
const edlItemCreateRules = [
    edlIdParam,
    body('piece').notEmpty().withMessage('piece est obligatoire').bail().isString().isLength({ max: 100 }).withMessage('piece invalide'),
    body('nom').notEmpty().withMessage('nom est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('nom invalide'),
    body('etat').notEmpty().withMessage('etat est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('etat invalide'),
    body('inventory_item_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('inventory_item_id invalide'),
    body('categorie').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('catégorie invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('description trop longue'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const edlItemUpdateRules = [
    edlIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
    body('etat').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('etat invalide'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const edlItemDeleteRules = [
    edlIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
];
const edlSignRules = [
    edlIdParam,
    body('signatures').exists({ checkNull: true }).withMessage('signatures requis'),
];
const edlUpdateRules = [
    edlIdParam,
    body('statut').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('statut invalide'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
];

// Protect all routes with auth check and RLS context
router.use(protect);
router.use(tenantGuard);

// ============================================
// GET /api/edl - Liste des états des lieux
// ============================================
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { lot_id, type_edl, statut } = req.query;
        
        let query = `
            SELECT e.*, 
                   l.ref_lot, l.type as lot_type,
                   (SELECT COUNT(*) FROM edl_items WHERE edl_id = e.id) as item_count
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            WHERE 1=1
        `;
        const params: any[] = [];
        
        if (lot_id) {
            params.push(lot_id);
            query += ` AND e.lot_id = $${params.length}`;
        }
        
        if (type_edl) {
            params.push(type_edl);
            query += ` AND e.type_edl = $${params.length}`;
        }
        
        if (statut) {
            params.push(statut);
            query += ` AND e.statut = $${params.length}`;
        }
        
        query += ` ORDER BY e.date_realisation DESC, e.created_at DESC`;
        
        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/:id - Détails complets d'un EDL
// ============================================
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        
        // Get EDL Header
        const edlResult = await dbClient.query(`
            SELECT e.*, 
                   l.ref_lot, l.type as lot_type,
                   'Bail #' || loc.id as ref_location,
                   parent.ref_edl as parent_ref
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN baux loc ON e.location_id = loc.id
            LEFT JOIN edl_inspections parent ON e.parent_edl_id = parent.id
            WHERE e.id = $1
        `, [id]);
        
        if (edlResult.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        
        const edl = edlResult.rows[0];
        
        // Get Items
        const itemsResult = await dbClient.query(`
            SELECT * FROM edl_items 
            WHERE edl_id = $1 
            ORDER BY piece, nom
        `, [id]);
        
        res.json({
            ...edl,
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching EDL details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// POST /api/edl - Créer un nouvel état des lieux
// ============================================
router.post('/', validate(edlCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const resolvedOwnerId = (req as any).resolvedOwnerId;
        const {
            lot_id,
            location_id,
            type_edl,
            date_realisation,
            locataire_id,
            locataire_name,
            locataire_present,
            commentaires,
            parent_edl_id
        } = req.body;
        
        // Générer référence unique
        const year = new Date().getFullYear();
        const seqResult = await dbClient.query(`SELECT nextval('edl_ref_seq')`);
        const seq = seqResult.rows[0].nextval;
        const ref_edl = `EDL-${year}-${String(seq).padStart(4, '0')}`;
        
        const result = await dbClient.query(`
            INSERT INTO edl_inspections (
                ref_edl, lot_id, location_id, type_edl, date_realisation,
                agent_id, agent_name, locataire_id, locataire_name, 
                locataire_present, commentaires, parent_edl_id, owner_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            ref_edl,
            lot_id,
            location_id || null,
            type_edl,
            date_realisation || new Date(),
            req.user?.id,
            `${req.user?.nom} ${req.user?.prenoms}`,
            locataire_id || null,
            locataire_name || '',
            locataire_present !== false,
            commentaires || '',
            parent_edl_id || null,
            resolvedOwnerId
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// POST /api/edl/:id/items - Ajouter/Modifier des items
// ============================================
router.post('/:id/items', validate(edlItemCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        const checkResult = await dbClient.query('SELECT id FROM edl_inspections WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }

        const {
            inventory_item_id,
            piece,
            categorie,
            nom,
            description,
            etat,
            quantite,
            observation,
            photos
        } = req.body;
        
        const result = await dbClient.query(`
            INSERT INTO edl_items (
                edl_id, inventory_item_id, piece, categorie, nom,
                description, etat, quantite, observation, photos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            id,
            inventory_item_id || null,
            piece,
            categorie || '',
            nom,
            description || '',
            etat,
            quantite || 1,
            observation || '',
            JSON.stringify(photos || [])
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/items/:itemId - Modifier un item
// ============================================
router.put('/:id/items/:itemId', validate(edlItemUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;
        
        const checkResult = await dbClient.query('SELECT id FROM edl_inspections WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
             return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }

        const { etat, quantite, observation, photos } = req.body;
        
        const result = await dbClient.query(`
            UPDATE edl_items SET
                etat = COALESCE($1, etat),
                quantite = COALESCE($2, quantite),
                observation = COALESCE($3, observation),
                photos = COALESCE($4, photos)
            WHERE id = $5 AND edl_id = $6
            RETURNING *
        `, [
            etat,
            quantite,
            observation,
            photos ? JSON.stringify(photos) : null,
            itemId,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// DELETE /api/edl/:id/items/:itemId - Supprimer un item
// ============================================
router.delete('/:id/items/:itemId', validate(edlItemDeleteRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;
        
        const checkResult = await dbClient.query('SELECT id FROM edl_inspections WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
             return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }

        const result = await dbClient.query('DELETE FROM edl_items WHERE id = $1 AND edl_id = $2 RETURNING id', [itemId, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        res.json({ message: 'Élément supprimé' });
    } catch (error) {
        console.error('Error deleting EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/sign - Enregistrer les signatures
// ============================================
router.put('/:id/sign', validate(edlSignRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { signatures } = req.body;
        
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                signatures_json = $1,
                statut = 'signe',
                validated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [
            JSON.stringify(signatures),
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error signing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id - Mettre à jour un EDL (statut, commentaires)
// ============================================
router.put('/:id', validate(edlUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { statut, commentaires } = req.body;
        
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [
            statut,
            commentaires,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/compare/:idEntree/:idSortie - Comparaison Entrée/Sortie
// ============================================
router.get('/compare/:idEntree/:idSortie', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { idEntree, idSortie } = req.params;
        
        // Get both EDLs (le RLS filtre ceux qui ne m'appartiennent pas)
        const edlEntree = await dbClient.query('SELECT * FROM edl_inspections WHERE id = $1', [idEntree]);
        const edlSortie = await dbClient.query('SELECT * FROM edl_inspections WHERE id = $1', [idSortie]);
        
        if (edlEntree.rows.length === 0 || edlSortie.rows.length === 0) {
            return res.status(404).json({ message: 'Un ou plusieurs EDL introuvables ou accès refusé' });
        }
        
        // Get items for both
        const itemsEntree = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idEntree]);
        const itemsSortie = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idSortie]);
        
        res.json({
            entree: {
                ...edlEntree.rows[0],
                items: itemsEntree.rows
            },
            sortie: {
                ...edlSortie.rows[0],
                items: itemsSortie.rows
            }
        });
    } catch (error) {
        console.error('Error comparing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — edlRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Utilisation exclusive de req.dbClient à la place de pool.query.
 * ✅ Application globale de protect et tenantGuard en haut de fichier via router.use().
 * ✅ Injection de owner_id = resolvedOwnerId dans l'INSERT de la table edl_inspections.
 * ✅ Blocages IDOR stricts : 404 retourné si les requêtes UPDATE/DELETE retournent rowCount === 0.
 * ✅ Ajout d'une vérification parente sur edl_items pour sécuriser les sous-routes d'état des lieux.
 * ✅ L'appele à la séquence id ('edl_ref_seq') passe sans soucis par dbClient.
 * ═══════════════════════════════════════════════════
 */

export default router;
