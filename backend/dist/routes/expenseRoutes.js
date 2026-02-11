"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const ownerIsolation_1 = require("../middleware/ownerIsolation");
const router = (0, express_1.Router)();
// Protect all routes
router.use(authMiddleware_1.protect);
// GET /api/expenses - List expenses (filtered by owner)
router.get('/', permissionMiddleware_1.default.canRead('finances'), ownerIsolation_1.filterByOwner, async (req, res) => {
    try {
        const { building_id, owner_id, category, start_date, end_date } = req.query;
        const ownerIds = req.ownerIds;
        const ownerWhereClause = (0, ownerIsolation_1.buildOwnerWhereClause)(ownerIds);
        let query = `
            SELECT e.*, 
                   b.nom as building_name,
                   l.ref_lot,
                   ep.name as category_label
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN expense_categories ep ON e.category = ep.name
            WHERE ${ownerWhereClause.replace(/owner_id/g, 'e.owner_id')}
        `;
        const params = [];
        let pIdx = 1;
        if (building_id) {
            query += ` AND e.building_id = $${pIdx++}`;
            params.push(building_id);
        }
        if (owner_id) {
            query += ` AND e.owner_id = $${pIdx++}`;
            params.push(owner_id);
        }
        if (category) {
            query += ` AND e.category = $${pIdx++}`;
            params.push(category);
        }
        if (start_date) {
            query += ` AND e.date_expense >= $${pIdx++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.date_expense <= $${pIdx++}`;
            params.push(end_date);
        }
        query += ` ORDER BY e.date_expense DESC, e.created_at DESC`;
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/expenses/categories - List categories
router.get('/categories', async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/expenses - Create expense
router.post('/', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    try {
        const { building_id, lot_id, owner_id, category, description, amount, date_expense, supplier_name, proof_url } = req.body;
        // Validation simple
        if (!amount || !date_expense || !category) {
            return res.status(400).json({ message: 'Champs obligatoires manquants' });
        }
        const result = await database_1.default.query(`
            INSERT INTO expenses (
                building_id, lot_id, owner_id, category, description,
                amount, date_expense, supplier_name, status, proof_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9)
            RETURNING *
        `, [
            building_id || null,
            lot_id || null,
            owner_id || null,
            category,
            description || '',
            amount,
            date_expense,
            supplier_name || '',
            proof_url || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// DELETE /api/expenses/:id
router.delete('/:id', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.query('DELETE FROM expenses WHERE id = $1', [id]);
        res.json({ message: 'Dépense supprimée' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
