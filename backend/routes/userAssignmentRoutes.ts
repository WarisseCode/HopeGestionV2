import { Router } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

// GET /api/user-assignments/:userId
// Get all owner assignments for a specific user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT 
                uoa.id,
                uoa.owner_id,
                uoa.assigned_at,
                uoa.is_active,
                uoa.notes,
                o.name as owner_name,
                o.type as type_proprietaire
            FROM user_owner_assignments uoa
            JOIN owners o ON o.id = uoa.owner_id
            WHERE uoa.user_id = $1 AND uoa.is_active = true
            ORDER BY o.name
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/user-assignments/by-owner/:ownerId
// Get all users assigned to a specific owner
router.get('/by-owner/:ownerId', async (req, res) => {
    try {
        const { ownerId } = req.params;
        const result = await pool.query(`
            SELECT 
                uoa.id,
                uoa.user_id,
                uoa.assigned_at,
                u.nom as user_name,
                u.email,
                u.role
            FROM user_owner_assignments uoa
            JOIN users u ON u.id = uoa.user_id
            WHERE uoa.owner_id = $1 AND uoa.is_active = true
            ORDER BY u.nom
        `, [ownerId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users for owner:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/user-assignments
// Assign a user to an owner
router.post('/', async (req: any, res) => {
    try {
        const { user_id, owner_id, notes } = req.body;
        const assigned_by = req.userId; // From auth middleware

        // Check if assignment already exists
        const existing = await pool.query(
            'SELECT id FROM user_owner_assignments WHERE user_id = $1 AND owner_id = $2',
            [user_id, owner_id]
        );

        if (existing.rows.length > 0) {
            // Reactivate if exists but was deactivated
            await pool.query(
                'UPDATE user_owner_assignments SET is_active = true, notes = $3 WHERE user_id = $1 AND owner_id = $2',
                [user_id, owner_id, notes || null]
            );
            return res.json({ message: 'Affectation réactivée', id: existing.rows[0].id });
        }

        const result = await pool.query(`
            INSERT INTO user_owner_assignments (user_id, owner_id, assigned_by, notes)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [user_id, owner_id, assigned_by, notes || null]);

        res.status(201).json({ message: 'Affectation créée', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/user-assignments/:id
// Remove an assignment (soft delete - set is_active = false)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'UPDATE user_owner_assignments SET is_active = false WHERE id = $1',
            [id]
        );
        res.json({ message: 'Affectation supprimée' });
    } catch (error) {
        console.error('Error removing assignment:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/user-assignments/bulk/:userId
// Bulk update assignments for a user (replaces all assignments)
router.put('/bulk/:userId', async (req: any, res) => {
    try {
        const { userId } = req.params;
        const { owner_ids } = req.body; // Array of owner IDs
        const assigned_by = req.userId;

        // Deactivate all current assignments
        await pool.query(
            'UPDATE user_owner_assignments SET is_active = false WHERE user_id = $1',
            [userId]
        );

        // Create/reactivate new assignments
        for (const ownerId of owner_ids) {
            await pool.query(`
                INSERT INTO user_owner_assignments (user_id, owner_id, assigned_by, is_active)
                VALUES ($1, $2, $3, true)
                ON CONFLICT (user_id, owner_id) 
                DO UPDATE SET is_active = true, assigned_at = CURRENT_TIMESTAMP
            `, [userId, ownerId, assigned_by]);
        }

        res.json({ message: 'Affectations mises à jour', count: owner_ids.length });
    } catch (error) {
        console.error('Error bulk updating assignments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
