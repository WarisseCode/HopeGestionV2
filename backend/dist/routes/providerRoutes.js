"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * Helper: Récupérer l'ID propriétaire géré
 */
const getManagedOwnerId = async (userId) => {
    const result = await database_1.default.query(`SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`, [userId]);
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};
// GET /api/providers
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);
        // Fetch providers specific to owner OR global providers (owner_id IS NULL)
        const query = ownerId
            ? `SELECT * FROM providers WHERE (owner_id = $1 OR owner_id IS NULL) ORDER BY name ASC`
            : `SELECT * FROM providers WHERE owner_id IS NULL ORDER BY name ASC`; // Admin/Global only if no owner context (simplified)
        // Note: For a gestionnaire without specific owner context (viewing all?), logic might differ. 
        // Assuming context-based view for now.
        const result = await database_1.default.query(query, ownerId ? [ownerId] : []);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement prestataires' });
    }
});
// POST /api/providers
router.post('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const { name, specialty, contact_name, phone, email, address } = req.body;
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);
        const result = await database_1.default.query(`INSERT INTO providers (owner_id, name, specialty, contact_name, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [ownerId, name, specialty, contact_name, phone, email, address]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création prestataire' });
    }
});
// PUT /api/providers/:id
router.put('/:id', authMiddleware_1.protect, async (req, res) => {
    try {
        const { name, specialty, contact_name, phone, email, address, status } = req.body;
        const id = req.params.id;
        const result = await database_1.default.query(`UPDATE providers SET name=$1, specialty=$2, contact_name=$3, phone=$4, email=$5, address=$6, status=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`, [name, specialty, contact_name, phone, email, address, status, id]);
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur modification' });
    }
});
// DELETE /api/providers/:id
router.delete('/:id', authMiddleware_1.protect, async (req, res) => {
    try {
        await database_1.default.query('DELETE FROM providers WHERE id = $1', [req.params.id]);
        res.json({ message: 'Prestataire supprimé' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});
exports.default = router;
