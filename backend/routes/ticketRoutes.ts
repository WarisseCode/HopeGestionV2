import express from 'express';
// Exception documentée — pool autorisé UNIQUEMENT pour les 
// routes locataires sans owner_id ou routes mixtes résolvant en aval le owner_id.
// Pour le reste, (routes gestionnaires), utiliser absolument req.dbClient
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';

const router = express.Router();

// GET /api/tickets (Gestionnaire)
router.get('/', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        
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
        
        // Plus de verification manuelle propriétaire (le RLS DB filtre silencieusement b.owner_id / owner_id via les jointures si activé,
        // et plus particulièrement la sélection brute depuis ticket est limitée à owner_id)
        
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

        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tickets' });
    }
});

// [LOCATAIRE] Route appelée par le locataire connecté.
// tenantGuard non applicable : le locataire n'a pas d'owner_id.
// Isolation garantie par filtrage strict sur req.user.id (JWT).
// pool.query autorisé ici par exception documentée.
// GET /api/tickets/tenant - Tickets for current tenant
router.get('/tenant', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        
        // Find tenant linked to this user (filtered solely by JWT user_id)
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

// [MIXTE] Route appelée par locataire ou gestionnaire.
// tenantGuard non applicable : l'owner_id est déduit du lot_id.
// Sécurité : owner_id jamais fourni par le client — 
// toujours résolu depuis la DB via lot_id.
// POST /api/tickets
router.post('/', protect, async (req: any, res) => {
    try {
        const { lot_id, type, category, description, priorite, urgency, photos_before, requester_name, requester_phone } = req.body;
        const lotIdValue = lot_id && lot_id !== '' ? parseInt(lot_id, 10) : null;
        
        // Verification et déduction owner strict
        if (!lotIdValue) {
            return res.status(400).json({ message: 'L\'ID du lot est requis' });
        }

        const lotRes = await pool.query(
            'SELECT owner_id FROM lots WHERE id = $1',
            [lotIdValue]
        );
        if (lotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable' });
        }
        const deducedOwnerId = lotRes.rows[0].owner_id;
        
        const result = await pool.query(
            `INSERT INTO tickets (lot_id, titre, category, description, priorite, urgency, photos_before, requester_name, requester_phone, statut, date_creation, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Ouvert', NOW(), $10) RETURNING *`,
            [lotIdValue, type, category, description, priorite, urgency || priorite, JSON.stringify(photos_before || []), requester_name, requester_phone, deducedOwnerId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création ticket' });
    }
});

// PUT /api/tickets/:id (Assign/Update) (Gestionnaire)
router.put('/:id', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const { provider_id, scheduled_date, statut, cost_estimated } = req.body;
        const id = req.params.id;

        if (provider_id) {
             const result = await dbClient.query(
                `UPDATE tickets SET provider_id=$1, scheduled_date=$2, cost_estimated=$3, statut=$4, updated_at=NOW()
                 WHERE id=$5 RETURNING *`,
                [provider_id, scheduled_date, cost_estimated, statut || 'En cours', id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
            }
            res.json(result.rows[0]);
        } else {
            const result = await dbClient.query(
                `UPDATE tickets SET statut=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
                [statut, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
            }
            res.json(result.rows[0]);
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur modification ticket' });
    }
});

// POST /api/tickets/:id/reschedule (Gestionnaire)
router.post('/:id/reschedule', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const { new_date, reason } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
            `UPDATE tickets SET 
                scheduled_date = $1, 
                statut = 'En attente',
                description = description || '\n[Reprogrammé]: ' || $2,
                updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [new_date, reason || 'Reprogrammé', id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur reprogrammation' });
    }
});

// POST /api/tickets/:id/close (Gestionnaire)
router.post('/:id/close', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const { cost_real, photos_after, comments, actions_done } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
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

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur clôture ticket' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — ticketRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Exception Locataire (GET /tenant) documentée et gérée de manière isolée via req.user.id.
 * ✅ Exception Mixte (POST /) documentée et sécurisée par la déduction intra-base du owner_id via le lot_id.
 * ✅ tenantGuard assigné strictement aux routes 100% Gestionnaires (GET /, PUT, POST close/reschedule).
 * ✅ L'helper getManagedOwnerId supprimé et remplacé par l'automatisation RLS.
 * ✅ UPDATE bloquant RLS complété avec des throw error 404 (rowCount === 0 explicit refus).
 * ═══════════════════════════════════════════════════
 */

export default router;
