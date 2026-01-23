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

// GET /api/tickets
router.get('/', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);
        
        // Query filters
        const { statut, priorite, category } = req.query;

        let query = `
            SELECT t.*, 
                   l.ref_lot, b.nom as building_name, 
                   p.name as provider_name,
                   tn.nom as tenant_name, tn.prenoms as tenant_surname
            FROM tickets t
            LEFT JOIN lots l ON t.lot_id = l.id
            LEFT JOIN buildings b ON l.building_id = b.id
            LEFT JOIN providers p ON t.provider_id = p.id
            LEFT JOIN leases le ON l.id = le.lot_id AND le.statut = 'actif'
            LEFT JOIN tenants tn ON le.tenant_id = tn.id
            WHERE 1=1
        `;
        
        let params: any[] = [];
        let paramIndex = 1;
        
        if (ownerId) {
             query += ` AND b.owner_id = $${paramIndex}`;
             params.push(ownerId);
             paramIndex++;
        }
        
        if (statut) {
            query += ` AND t.statut = $${paramIndex}`;
            params.push(statut);
            paramIndex++;
        }
        
        if (priorite) {
            query += ` AND t.priorite = $${paramIndex}`;
            params.push(priorite);
            paramIndex++;
        }
        
        if (category) {
            query += ` AND t.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        query += ` ORDER BY t.date_creation DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tickets' });
    }
});

// GET /api/tickets/tenant - Tickets for current tenant
router.get('/tenant', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        
        // Find tenant linked to this user
        const tenantResult = await pool.query(
            `SELECT t.id FROM tenants t WHERE t.user_id = $1`,
            [userId]
        );
        
        if (tenantResult.rows.length === 0) {
            return res.json([]);
        }
        
        const tenantId = tenantResult.rows[0].id;
        
        // Get tickets for lots where this tenant has an active lease
        const result = await pool.query(
            `SELECT t.*, l.ref_lot, b.nom as building_name, p.name as provider_name
             FROM tickets t
             JOIN lots l ON t.lot_id = l.id
             JOIN buildings b ON l.building_id = b.id
             LEFT JOIN providers p ON t.provider_id = p.id
             JOIN leases le ON l.id = le.lot_id AND le.tenant_id = $1 AND le.statut = 'actif'
             ORDER BY t.date_creation DESC`,
            [tenantId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tickets locataire' });
    }
});

// POST /api/tickets
router.post('/', protect, async (req: any, res) => {
    try {
        const { lot_id, type, category, description, priorite, urgency, photos_before, requester_name, requester_phone } = req.body;
        const lotIdValue = lot_id && lot_id !== '' ? parseInt(lot_id, 10) : null;
        
        const result = await pool.query(
            `INSERT INTO tickets (lot_id, titre, category, description, priorite, urgency, photos_before, requester_name, requester_phone, statut, date_creation)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Ouvert', NOW()) RETURNING *`,
            [lotIdValue, type, category, description, priorite, urgency || priorite, JSON.stringify(photos_before || []), requester_name, requester_phone]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création ticket' });
    }
});

// PUT /api/tickets/:id (Assign/Update)
router.put('/:id', protect, async (req: any, res) => {
    try {
        const { provider_id, scheduled_date, statut, cost_estimated } = req.body;
        const id = req.params.id;

        if (provider_id) {
             const result = await pool.query(
                `UPDATE tickets SET provider_id=$1, scheduled_date=$2, cost_estimated=$3, statut=$4, updated_at=NOW()
                 WHERE id=$5 RETURNING *`,
                [provider_id, scheduled_date, cost_estimated, statut || 'En cours', id]
            );
            res.json(result.rows[0]);
        } else {
            const result = await pool.query(
                `UPDATE tickets SET statut=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
                [statut, id]
            );
            res.json(result.rows[0]);
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur modification ticket' });
    }
});

// POST /api/tickets/:id/reschedule
router.post('/:id/reschedule', protect, async (req: any, res) => {
    try {
        const { new_date, reason } = req.body;
        const id = req.params.id;

        const result = await pool.query(
            `UPDATE tickets SET 
                scheduled_date = $1, 
                statut = 'En attente',
                description = description || '\n[Reprogrammé]: ' || $2,
                updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [new_date, reason || 'Reprogrammé', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur reprogrammation' });
    }
});

// POST /api/tickets/:id/close
router.post('/:id/close', protect, async (req: any, res) => {
    try {
        const { cost_real, photos_after, comments, actions_done } = req.body;
        const id = req.params.id;

        const result = await pool.query(
            `UPDATE tickets SET 
                statut='Clos', 
                cost_real=$1, 
                photos_after=$2, 
                description = description || '\n[Clôture - Actions]: ' || $3 || '\n[Commentaire]: ' || $4,
                date_resolution=NOW(),
                updated_at=NOW()
             WHERE id=$5 RETURNING *`,
            [cost_real, JSON.stringify(photos_after || []), actions_done || '', comments || '', id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur clôture ticket' });
    }
});

export default router;

