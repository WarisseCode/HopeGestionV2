"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Protect all routes
router.use(authMiddleware_1.protect);
// GET /api/inventories - List inventories (filtered by entity)
router.get('/', async (req, res) => {
    try {
        const { entity_type, entity_id } = req.query;
        let query = `
            SELECT i.*, 
                   u.nom as agent_nom_user, u.prenoms as agent_prenoms_user,
                   (SELECT COUNT(*) FROM inventory_items WHERE inventory_id = i.id) as item_count
            FROM inventories i
            LEFT JOIN users u ON i.agent_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (entity_type && entity_id) {
            params.push(entity_type, entity_id);
            query += ` AND i.entity_type = $${params.length - 1} AND i.entity_id = $${params.length}`;
        }
        query += ` ORDER BY i.date_realisation DESC, i.created_at DESC`;
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching inventories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/inventories/:id - Get full details with items
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get Inventory Header
        const result = await database_1.default.query(`
            SELECT i.*, 
                   u.nom as agent_nom_user, u.prenoms as agent_prenoms_user
            FROM inventories i
            LEFT JOIN users u ON i.agent_id = u.id
            WHERE i.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inventaire non trouvé' });
        }
        const inventory = result.rows[0];
        // Get Items
        const itemsResult = await database_1.default.query(`
            SELECT * FROM inventory_items 
            WHERE inventory_id = $1 
            ORDER BY categorie, nom
        `, [id]);
        res.json({
            ...inventory,
            items: itemsResult.rows
        });
    }
    catch (error) {
        console.error('Error fetching inventory details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/inventories - Create new inventory header
router.post('/', async (req, res) => {
    try {
        const { entity_type, entity_id, date_realisation, type_inventaire, commentaires } = req.body;
        const result = await database_1.default.query(`
            INSERT INTO inventories (
                entity_type, entity_id, date_realisation, type_inventaire, 
                agent_id, agent_name, statut, commentaires
            ) VALUES ($1, $2, $3, $4, $5, $6, 'brouillon', $7)
            RETURNING *
        `, [
            entity_type,
            entity_id,
            date_realisation || new Date(),
            type_inventaire,
            req.user?.id,
            `${req.user?.nom} ${req.user?.prenoms}`,
            commentaires || ''
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating inventory:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/inventories/:id/items - Add item(s)
router.post('/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const { categorie, nom, etat, quantite, description, observation, photos } = req.body;
        const result = await database_1.default.query(`
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
    }
    catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/inventories/:id/items/:itemId - Update item
router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { etat, quantite, description, observation, photos } = req.body;
        const result = await database_1.default.query(`
            UPDATE inventory_items SET
                etat = COALESCE($1, etat),
                quantite = COALESCE($2, quantite),
                description = COALESCE($3, description),
                observation = COALESCE($4, observation),
                photos = COALESCE($5, photos)
            WHERE id = $6
            RETURNING *
        `, [
            etat,
            quantite,
            description,
            observation,
            photos ? JSON.stringify(photos) : null,
            itemId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// DELETE /api/inventories/:id/items/:itemId - Delete item
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        await database_1.default.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
        res.json({ message: 'Élément supprimé' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/inventories/:id - Update header/status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { statut, commentaires, signature_locataire, signature_agent } = req.body;
        const result = await database_1.default.query(`
            UPDATE inventories SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                signature_locataire = COALESCE($3, signature_locataire),
                signature_agent = COALESCE($4, signature_agent),
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [
            statut,
            commentaires,
            signature_locataire,
            signature_agent,
            id
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inventaire non trouvé' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
