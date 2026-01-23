import { Router, Response } from 'express';
import pool from '../db/database';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

// GET /api/expenses - List expenses
router.get('/', permissions.canRead('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { building_id, owner_id, category, start_date, end_date } = req.query;
        
        let query = `
            SELECT e.*, 
                   b.nom as building_name,
                   l.ref_lot,
                   ep.name as category_label
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN expense_categories ep ON e.category = ep.name
            WHERE 1=1
        `;
        
        const params: any[] = [];
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
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/expenses/categories - List categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/expenses - Create expense
router.post('/', permissions.canWrite('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            building_id,
            lot_id,
            owner_id,
            category,
            description,
            amount,
            date_expense,
            supplier_name,
            proof_url
        } = req.body;

        // Validation simple
        if (!amount || !date_expense || !category) {
            return res.status(400).json({ message: 'Champs obligatoires manquants' });
        }

        const result = await pool.query(`
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
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', permissions.canWrite('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
        res.json({ message: 'Dépense supprimée' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
