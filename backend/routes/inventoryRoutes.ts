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

// Isolation par propriétaire explicite (défense en profondeur) — le rôle DB peut avoir
// BYPASSRLS, la RLS seule ne suffit pas. Concatène la clause et pousse le paramètre.
function scopeByOwner(req: AuthenticatedRequest, params: any[], col = 'owner_id'): string {
    if ((req as any).userRole === 'admin') return '';
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    params.push(validOwnerIds);
    return ` AND ${col} = ANY($${params.length}::int[])`;
}

// Vérifie l'existence + l'appartenance de l'inventaire parent (pour les sous-routes /items).
async function fetchOwnedInventory(req: AuthenticatedRequest, invId: string | undefined): Promise<{ id: number } | null> {
    const dbClient = (req as any).dbClient;
    const params: any[] = [invId];
    const clause = scopeByOwner(req, params);
    const r = await dbClient.query(`SELECT id FROM inventories WHERE id = $1${clause}`, params);
    return r.rows[0] || null;
}

// PK SERIAL (convention de l'app — entités lots/buildings également en int).
const invIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant inventaire invalide');

const inventoryCreateRules = [
    body('entity_type').notEmpty().withMessage('entity_type est obligatoire').bail().isString().isLength({ max: 30 }).withMessage('entity_type invalide'),
    body('entity_id').notEmpty().withMessage('entity_id est obligatoire').bail().isInt({ min: 1 }).withMessage('entity_id invalide'),
    body('type_inventaire').notEmpty().withMessage('type_inventaire est obligatoire').bail().isString().isLength({ max: 30 }).withMessage('type_inventaire invalide'),
    body('date_realisation').optional({ nullable: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
];
const inventoryItemCreateRules = [
    invIdParam,
    body('categorie').notEmpty().withMessage('categorie est obligatoire').bail().isString().isLength({ max: 100 }).withMessage('categorie invalide'),
    body('nom').notEmpty().withMessage('nom est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('nom invalide'),
    body('etat').notEmpty().withMessage('etat est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('etat invalide'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('description trop longue'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const inventoryItemUpdateRules = [
    invIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
    body('etat').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('etat invalide'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('description trop longue'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const inventoryItemDeleteRules = [
    invIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
];
const inventoryUpdateRules = [
    invIdParam,
    body('statut').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('statut invalide'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
];

// Protect all routes
router.use(protect);
router.use(tenantGuard);

// GET /api/inventories - List inventories (filtered by entity)
router.get('/', permissions.canRead('biens'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { entity_type, entity_id } = req.query;

        // Le nom de l'agent est stocké en dur sur inventories.agent_name (cf. migration 049c) :
        // pas de JOIN sur users (la table users n'a pas de colonne prenoms → 42703).
        let query = `
            SELECT i.*,
                   (SELECT COUNT(*) FROM inventory_items WHERE inventory_id = i.id) as item_count
            FROM inventories i
            WHERE 1=1
        `;
        const params: any[] = [];
        query += scopeByOwner(req, params, 'i.owner_id');

        if (entity_type && entity_id) {
            params.push(entity_type, entity_id);
            query += ` AND i.entity_type = $${params.length - 1} AND i.entity_id = $${params.length}`;
        }

        query += ` ORDER BY i.date_realisation DESC, i.created_at DESC`;

        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching inventories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/inventories/:id - Get full details with items
router.get('/:id', permissions.canRead('biens'), validate([invIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        // Get Inventory Header
        const params: any[] = [id];
        const ownerClause = scopeByOwner(req, params, 'i.owner_id');
        const result = await dbClient.query(`
            SELECT i.*
            FROM inventories i
            WHERE i.id = $1${ownerClause}
        `, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inventaire non trouvé ou accès refusé' });
        }

        const inventory = result.rows[0];

        // Get Items
        const itemsResult = await dbClient.query(`
            SELECT * FROM inventory_items 
            WHERE inventory_id = $1 
            ORDER BY categorie, nom
        `, [id]);

        res.json({
            ...inventory,
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching inventory details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/inventories - Create new inventory header
router.post('/', permissions.canWrite('biens'), validate(inventoryCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const isAdmin = (req as any).userRole === 'admin';
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];

        const {
            entity_type,
            entity_id,
            date_realisation,
            type_inventaire,
            commentaires
        } = req.body;

        // L'owner fait foi via l'entité inspectée (lot → immeuble, ou immeuble direct).
        // On ne se fie pas à resolvedOwnerId (null pour un gestionnaire multi-owner).
        let ownerRow;
        if (entity_type === 'lot') {
            ownerRow = await dbClient.query(
                `SELECT b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1`, [entity_id]
            );
        } else if (entity_type === 'building') {
            ownerRow = await dbClient.query(`SELECT owner_id FROM buildings WHERE id = $1`, [entity_id]);
        } else {
            return res.status(400).json({ message: 'entity_type invalide (lot ou building attendu).' });
        }
        const ownerId = ownerRow.rows[0]?.owner_id;
        if (!ownerId) {
            return res.status(404).json({ message: 'Entité introuvable ou accès refusé.' });
        }
        if (!isAdmin && !validOwnerIds.includes(ownerId)) {
            return res.status(403).json({ message: 'Accès refusé à cette entité.' });
        }

        const agentName = [req.user?.nom, req.user?.prenoms].filter(Boolean).join(' ');

        const result = await dbClient.query(`
            INSERT INTO inventories (
                entity_type, entity_id, date_realisation, type_inventaire,
                agent_id, agent_name, statut, commentaires, owner_id
            ) VALUES ($1, $2, $3, $4, $5, $6, 'brouillon', $7, $8)
            RETURNING *
        `, [
            entity_type,
            entity_id,
            date_realisation || new Date(),
            type_inventaire,
            req.user?.id,
            agentName,
            commentaires || '',
            ownerId
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating inventory:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/inventories/:id/items - Add item(s)
router.post('/:id/items', permissions.canWrite('biens'), validate(inventoryItemCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        // Isolation explicite par owner (et non la seule RLS) sur l'inventaire parent.
        if (!(await fetchOwnedInventory(req, id))) {
            return res.status(404).json({ message: 'Inventaire non trouvé ou accès refusé' });
        }

        const { categorie, nom, etat, quantite, description, observation, photos } = req.body;

        const result = await dbClient.query(`
            INSERT INTO inventory_items (
                inventory_id, categorie, nom, etat, quantite, 
                description, observation, photos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            id,
            categorie,
            nom,
            etat,
            quantite || 1,
            description || '',
            observation || '',
            JSON.stringify(photos || [])
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/inventories/:id/items/:itemId - Update item
router.put('/:id/items/:itemId', permissions.canWrite('biens'), validate(inventoryItemUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        if (!(await fetchOwnedInventory(req, id))) {
            return res.status(404).json({ message: 'Accès refusé à cet inventaire' });
        }

        const { etat, quantite, description, observation, photos } = req.body;

        const result = await dbClient.query(`
            UPDATE inventory_items SET
                etat = COALESCE($1, etat),
                quantite = COALESCE($2, quantite),
                description = COALESCE($3, description),
                observation = COALESCE($4, observation),
                photos = COALESCE($5, photos)
            WHERE id = $6 AND inventory_id = $7
            RETURNING *
        `, [
            etat,
            quantite,
            description,
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
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/inventories/:id/items/:itemId - Delete item
router.delete('/:id/items/:itemId', permissions.canWrite('biens'), validate(inventoryItemDeleteRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        if (!(await fetchOwnedInventory(req, id))) {
            return res.status(404).json({ message: 'Accès refusé à cet inventaire' });
        }

        const result = await dbClient.query('DELETE FROM inventory_items WHERE id = $1 AND inventory_id = $2 RETURNING id', [itemId, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        res.json({ message: 'Élément supprimé' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/inventories/:id - Update header/status
router.put('/:id', permissions.canWrite('biens'), validate(inventoryUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { statut, commentaires, signature_locataire, signature_agent } = req.body;

        const params: any[] = [statut, commentaires, signature_locataire, signature_agent, id];
        const ownerClause = scopeByOwner(req, params);
        const result = await dbClient.query(`
            UPDATE inventories SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                signature_locataire = COALESCE($3, signature_locataire),
                signature_agent = COALESCE($4, signature_agent),
                updated_at = NOW()
            WHERE id = $5${ownerClause}
            RETURNING *
        `, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inventaire non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — inventoryRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Utilisation exclusive de req.dbClient à la place de pool.query.
 * ✅ Application globale de tenantGuard via router.use().
 * ✅ Injection sécurisée de resolvedOwnerId sur la création de l'inventaire.
 * ✅ Blocages IDOR stricts : les UPDATES et DELETES retournent une erreur 404 (grâce au RLS via req.dbClient).
 * ✅ Vérification parente sur les inventory_items (validation locale du droit sur inventory_id).
 * ═══════════════════════════════════════════════════
 */

export default router;
