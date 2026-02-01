import express from 'express';
const router = express.Router();

import { pool } from '../index';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { filterByOwner, buildOwnerWhereClause } from '../middleware/ownerIsolation';

// GET /api/depenses - Liste des dépenses (filtrées par owner)
router.get('/', permissions.canRead('finance'), filterByOwner, async (req: AuthenticatedRequest, res) => {
    try {
        const ownerIds = (req as any).ownerIds;
        const whereClause = buildOwnerWhereClause(ownerIds);

        let query = `
            SELECT e.*, 
                   b.nom as building_name,
                   l.ref_lot,
                   o.name as owner_name
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN owners o ON e.owner_id = o.id
            WHERE ${whereClause.replace(/owner_id/g, 'e.owner_id')}
            ORDER BY e.date_expense DESC LIMIT 100
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur récupération dépenses:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// POST /api/depenses - Enregistrer une dépense
router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { building_id, lot_id, category, description, amount, date_expense, supplier_name, proof_url } = req.body;
        
        let owner_id = null;
        
        // Essayer de déduire le propriétaire
        if (building_id) {
            const bRes = await pool.query('SELECT owner_id FROM buildings WHERE id = $1', [building_id]);
            if (bRes.rows.length > 0) owner_id = bRes.rows[0].owner_id;
        } else if (lot_id) {
             const lRes = await pool.query('SELECT owner_id FROM lots WHERE id = $1', [lot_id]);
             if (lRes.rows.length > 0) owner_id = lRes.rows[0].owner_id;
        }

        const result = await pool.query(
            `INSERT INTO expenses 
            (building_id, lot_id, owner_id, category, description, amount, date_expense, supplier_name, proof_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [building_id || null, lot_id || null, owner_id || null, category, description, amount, date_expense || new Date(), supplier_name, proof_url || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur création dépense:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/depenses/stats - Statistiques dépenses (filtrées par owner)
router.get('/stats', permissions.canRead('finance'), filterByOwner, async (req: AuthenticatedRequest, res) => {
    try {
        const ownerIds = (req as any).ownerIds;
        const whereClause = buildOwnerWhereClause(ownerIds);
        
        const depensesMois = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE date_trunc('month', date_expense) = date_trunc('month', CURRENT_DATE)
            AND ${whereClause.replace(/owner_id/g, 'owner_id')}
        `);

        const depensesAnnee = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE date_trunc('year', date_expense) = date_trunc('year', CURRENT_DATE)
            AND ${whereClause.replace(/owner_id/g, 'owner_id')}
        `);

        res.json({
            mois: depensesMois.rows[0].total || 0,
            annee: depensesAnnee.rows[0].total || 0
        });
    } catch (error) {
        console.error('Erreur stats dépenses:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/depenses/history - Historique sur 6 mois (filtré par owner)
router.get('/history', permissions.canRead('finance'), filterByOwner, async (req: AuthenticatedRequest, res) => {
    try {
        const ownerIds = (req as any).ownerIds;
        const whereClause = buildOwnerWhereClause(ownerIds);
        
        const result = await pool.query(`
            SELECT 
                TO_CHAR(date_expense, 'Mon') as mois,
                EXTRACT(MONTH FROM date_expense) as mois_num,
                COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE date_expense >= CURRENT_DATE - INTERVAL '6 months'
            AND ${whereClause.replace(/owner_id/g, 'owner_id')}
            GROUP BY mois, mois_num 
            ORDER BY mois_num
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique depenses:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

export default router;
