import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Helper: Récupérer l'ID propriétaire géré
 */
const getManagedOwnerId = async (userId: number): Promise<number | null> => {
    const result = await pool.query(
        `SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};

// GET /api/service-contracts
router.get('/', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        const query = `
            SELECT sc.*, p.name as provider_name 
            FROM service_contracts sc
            LEFT JOIN providers p ON sc.provider_id = p.id
            WHERE (sc.owner_id = $1 OR sc.owner_id IS NULL)
            ORDER BY sc.start_date DESC`;
        
        const result = await pool.query(query, ownerId ? [ownerId] : []);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement contrats' });
    }
});

// POST /api/service-contracts
router.post('/', protect, async (req: any, res) => {
    try {
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        const result = await pool.query(
            `INSERT INTO service_contracts (owner_id, provider_id, title, description, cost_monthly, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [ownerId, provider_id, title, description, cost_monthly, start_date, end_date, status || 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création contrat' });
    }
});

// PUT /api/service-contracts/:id
router.put('/:id', protect, async (req: any, res) => {
    try {
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;
        const id = req.params.id;

        const result = await pool.query(
            `UPDATE service_contracts SET provider_id=$1, title=$2, description=$3, cost_monthly=$4, start_date=$5, end_date=$6, status=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`,
            [provider_id, title, description, cost_monthly, start_date, end_date, status, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur modification contrat' });
    }
});

// DELETE /api/service-contracts/:id
router.delete('/:id', protect, async (req: any, res) => {
    try {
        await pool.query('DELETE FROM service_contracts WHERE id = $1', [req.params.id]);
        res.json({ message: 'Contrat supprimé' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

export default router;
