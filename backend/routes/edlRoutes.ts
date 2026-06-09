import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import permissions from '../middleware/permissionMiddleware';
import { validate } from '../middleware/validate';

const router = express.Router();

// Valeurs autorisées (alignées sur les contraintes CHECK en base, migration 049) :
// renvoyer un 400 propre plutôt qu'un 500 (violation CHECK) sur une valeur hors liste.
const TYPES_EDL = ['entree', 'sortie', 'intermediaire'];
const STATUTS_EDL = ['brouillon', 'signe', 'cloture', 'archive'];
const ETATS_ITEM = ['neuf', 'bon', 'usager', 'mauvais', 'hs'];

// edl_inspections.id et edl_items.id sont SERIAL (int) — cf. migration 049.
const edlIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant EDL invalide');

const edlCreateRules = [
    body('lot_id').notEmpty().withMessage('lot_id est obligatoire').bail().isInt({ min: 1 }).withMessage('lot_id invalide'),
    body('type_edl').notEmpty().withMessage('type_edl est obligatoire').bail().isIn(TYPES_EDL).withMessage('type_edl invalide (entree, sortie, intermediaire)'),
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
    body('etat').notEmpty().withMessage('etat est obligatoire').bail().isIn(ETATS_ITEM).withMessage('etat invalide'),
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
    body('etat').optional({ nullable: true }).isIn(ETATS_ITEM).withMessage('etat invalide'),
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
    body('statut').optional({ nullable: true }).isIn(STATUTS_EDL).withMessage('statut invalide'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
];

// Protect all routes with auth check and RLS context
router.use(protect);
router.use(tenantGuard);

// ─── Isolation par propriétaire (défense en profondeur) ──────────────────────
// On filtre explicitement par owner_id en plus de la RLS : le rôle DB peut avoir
// BYPASSRLS (cf. locataireRoutes), auquel cas la RLS seule ne protège pas. Ce helper
// concatène la clause et pousse le paramètre, en respectant la numérotation $N.
// Admin : accès global (pas de clause). Gestionnaire sans owner : ANY('{}') → 0 ligne.
function scopeByOwner(req: AuthenticatedRequest, params: any[], col = 'owner_id'): string {
    if ((req as any).userRole === 'admin') return '';
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    params.push(validOwnerIds);
    return ` AND ${col} = ANY($${params.length}::int[])`;
}

// ============================================
// GET /api/edl - Liste des états des lieux
// ============================================
router.get('/', permissions.canRead('biens'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { lot_id, type_edl, statut } = req.query;

        // Colonnes explicites (pas e.*) : on exclut signatures_json (JSONB lourd, base64)
        // pour ne pas alourdir la liste — il n'est utile que sur le détail.
        let query = `
            SELECT e.id, e.ref_edl, e.lot_id, e.location_id, e.type_edl, e.date_realisation,
                   e.agent_id, e.agent_name, e.locataire_id, e.locataire_name, e.locataire_present,
                   e.statut, e.commentaires, e.parent_edl_id, e.validated_at, e.owner_id,
                   e.created_at, e.updated_at,
                   l.ref_lot, l.type as lot_type,
                   (SELECT COUNT(*) FROM edl_items WHERE edl_id = e.id) as item_count
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            WHERE 1=1
        `;
        const params: any[] = [];
        query += scopeByOwner(req, params, 'e.owner_id');

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
router.get('/:id', permissions.canRead('biens'), validate([edlIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        // Get EDL Header
        const params: any[] = [id];
        const ownerClause = scopeByOwner(req, params, 'e.owner_id');
        const edlResult = await dbClient.query(`
            SELECT e.*,
                   l.ref_lot, l.type as lot_type,
                   'Bail #' || loc.id as ref_location,
                   parent.ref_edl as parent_ref
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN leases loc ON e.location_id = loc.id
            LEFT JOIN edl_inspections parent ON e.parent_edl_id = parent.id
            WHERE e.id = $1${ownerClause}
        `, params);

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
router.post('/', permissions.canWrite('biens'), validate(edlCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const isAdmin = (req as any).userRole === 'admin';
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];
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

        // L'owner fait foi via le lot inspecté (lot → immeuble.owner_id). On ne se fie pas à
        // resolvedOwnerId qui est null pour un gestionnaire multi-owner sans owner_id explicite.
        const lotRes = await dbClient.query(
            `SELECT b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1`,
            [lot_id]
        );
        if (lotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable ou accès refusé' });
        }
        const ownerId = lotRes.rows[0].owner_id;
        // Vérif d'appartenance : empêche de créer un EDL sur le lot d'un autre propriétaire.
        if (!isAdmin && !validOwnerIds.includes(ownerId)) {
            return res.status(403).json({ message: 'Accès refusé à ce lot.' });
        }

        // Générer référence unique
        const year = new Date().getFullYear();
        const seqResult = await dbClient.query(`SELECT nextval('edl_ref_seq')`);
        const seq = seqResult.rows[0].nextval;
        const ref_edl = `EDL-${year}-${String(seq).padStart(4, '0')}`;

        // Nom de l'agent sans « undefined » si prenoms est absent.
        const agentName = [req.user?.nom, req.user?.prenoms].filter(Boolean).join(' ');

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
            agentName,
            locataire_id || null,
            locataire_name || '',
            locataire_present !== false,
            commentaires || '',
            parent_edl_id || null,
            ownerId
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Vérifie que l'EDL parent existe ET appartient à l'utilisateur (sinon 404).
// Centralise le contrôle d'isolation des sous-routes /items.
async function assertEdlOwned(req: AuthenticatedRequest, edlId: string | undefined): Promise<boolean> {
    const dbClient = (req as any).dbClient;
    const params: any[] = [edlId];
    const clause = scopeByOwner(req, params);
    const check = await dbClient.query(`SELECT id FROM edl_inspections WHERE id = $1${clause}`, params);
    return check.rows.length > 0;
}

// ============================================
// POST /api/edl/:id/items - Ajouter/Modifier des items
// ============================================
router.post('/:id/items', permissions.canWrite('biens'), validate(edlItemCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        if (!(await assertEdlOwned(req, id))) {
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
router.put('/:id/items/:itemId', permissions.canWrite('biens'), validate(edlItemUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        if (!(await assertEdlOwned(req, id))) {
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
router.delete('/:id/items/:itemId', permissions.canWrite('biens'), validate(edlItemDeleteRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        if (!(await assertEdlOwned(req, id))) {
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
router.put('/:id/sign', permissions.canWrite('biens'), validate(edlSignRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { signatures } = req.body;

        const params: any[] = [JSON.stringify(signatures), id];
        const ownerClause = scopeByOwner(req, params);
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                signatures_json = $1,
                statut = 'signe',
                validated_at = NOW()
            WHERE id = $2${ownerClause}
            RETURNING *
        `, params);

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
router.put('/:id', permissions.canWrite('biens'), validate(edlUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { statut, commentaires } = req.body;

        const params: any[] = [statut, commentaires, id];
        const ownerClause = scopeByOwner(req, params);
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                updated_at = NOW()
            WHERE id = $3${ownerClause}
            RETURNING *
        `, params);

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
router.get('/compare/:idEntree/:idSortie',
    permissions.canRead('biens'),
    validate([
        param('idEntree').isInt({ min: 1 }).withMessage('idEntree invalide'),
        param('idSortie').isInt({ min: 1 }).withMessage('idSortie invalide'),
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { idEntree, idSortie } = req.params;

        // Get both EDLs (isolation explicite par owner, en plus de la RLS)
        const pEntree: any[] = [idEntree];
        const edlEntree = await dbClient.query(`SELECT * FROM edl_inspections WHERE id = $1${scopeByOwner(req, pEntree)}`, pEntree);
        const pSortie: any[] = [idSortie];
        const edlSortie = await dbClient.query(`SELECT * FROM edl_inspections WHERE id = $1${scopeByOwner(req, pSortie)}`, pSortie);

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

export default router;
