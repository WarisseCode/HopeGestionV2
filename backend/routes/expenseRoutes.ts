import { Router, Response } from 'express';
import pool from '../db/database';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { filterByOwner, buildOwnerWhereClause } from '../middleware/ownerIsolation';

const router = Router();

// Protect all routes
router.use(protect);

// GET /api/expenses - List expenses (filtered by owner)
router.get('/', permissions.canRead('finances'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { building_id, owner_id, category, start_date, end_date } = req.query;
        const ownerIds = (req as any).ownerIds;
        const ownerWhereClause = buildOwnerWhereClause(ownerIds);
        
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

import { upload } from '../middleware/uploadMiddleware';

// POST /api/expenses - Create expense (with optional proof upload)
router.post('/', permissions.canWrite('finances'), upload.single('proof'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            building_id,
            lot_id,
            owner_id,
            category,
            description,
            amount,
            date_expense,
            supplier_name
        } = req.body;

        // Validation simple
        if (!amount || !date_expense || !category) {
            return res.status(400).json({ message: 'Champs obligatoires manquants' });
        }
        }

        // Determine owner_id
        let finalOwnerId = owner_id;

        if (building_id) {
            // Auto-fetch owner from building to ensure consistency
            const buildingResult = await pool.query('SELECT owner_id FROM buildings WHERE id = $1', [building_id]);
            if (buildingResult.rows.length > 0) {
                finalOwnerId = buildingResult.rows[0].owner_id;
            }
        }

        // If still no owner_id, this is an issue for strict isolation
        if (!finalOwnerId) {
             console.warn('⚠️ Creating expense without owner_id - will be invisible to strict isolation filters');
             // Optionally return 400 here if we want to enforce it strictly
             // return res.status(400).json({ message: 'Propriétaire ou Immeuble requis' });
        }

        // Handle uploaded proof file
        let proofUrl = req.body.proof_url || null;
        if (req.file) {
            // Build relative URL path for static serving
            proofUrl = `/uploads/expenses/${req.file.filename}`;
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
            finalOwnerId || null,
            category,
            description || '',
            amount,
            date_expense,
            supplier_name || '',
            proofUrl
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
