import express from 'express';
const router = express.Router();

import { pool } from '../index';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';

// GET /api/paiements - Liste des paiements
router.get('/', permissions.canRead('finance'), async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        let query = `
            SELECT p.*, 
                   t.nom as tenant_name, t.prenoms as tenant_surname, 
                   l.ref_lot, 
                   b.nom as building_name
            FROM payments p
            LEFT JOIN leases lease ON p.lease_id = lease.id
            LEFT JOIN tenants t ON lease.tenant_id = t.id
            LEFT JOIN lots l ON lease.lot_id = l.id
            LEFT JOIN buildings b ON l.building_id = b.id
        `;
        
        const params: any[] = [];

        // Filtrage selon le rôle
        if (userRole === 'proprietaire') {
            // Un propriétaire ne voit que les paiements liés à ses biens
            // Note: Simplification, on suppose qu'on a owner_id sur payments via migration
            query += ` WHERE p.owner_id = (SELECT id FROM owners WHERE phone = (SELECT telephone FROM users WHERE id = $1))`;
            params.push(userId);
        } 
        // Gestionnaires voient tout pour l'instant (ou filtrer par agence plus tard)
        
        query += ` ORDER BY p.date_paiement DESC LIMIT 100`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur récupération paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// POST /api/paiements - Enregistrer un paiement
router.post('/', permissions.canWrite('finance'), async (req: AuthenticatedRequest, res) => {
    try {
        const { lease_id, montant, type, mode_paiement, date_paiement, reference_transaction } = req.body;
        
        // 1. Récupérer infos du bail pour owner_id
        const leaseResult = await pool.query('SELECT owner_id FROM leases WHERE id = $1', [lease_id]);
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: "Bail non trouvé" });
        }
        const owner_id = leaseResult.rows[0].owner_id;

        // 2. Insérer paiement
        const result = await pool.query(
            `INSERT INTO payments 
            (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, owner_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [lease_id, montant, type, mode_paiement, date_paiement || new Date(), reference_transaction || null, owner_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur création paiement:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/paiements/stats - Statistiques financières
router.get('/stats', async (req: AuthenticatedRequest, res) => {
    try {
        // Revenus du mois en cours
        const revenusMois = await pool.query(`
            SELECT SUM(montant) as total 
            FROM payments 
            WHERE date_trunc('month', date_paiement) = date_trunc('month', CURRENT_DATE)
        `);

        // Revenus année
        const revenusAnnee = await pool.query(`
            SELECT SUM(montant) as total 
            FROM payments 
            WHERE date_trunc('year', date_paiement) = date_trunc('year', CURRENT_DATE)
        `);

        res.json({
            mois: revenusMois.rows[0].total || 0,
            annee: revenusAnnee.rows[0].total || 0
        });
    } catch (error) {
        console.error('Erreur stats paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/paiements/history - Historique sur 6 mois
router.get('/history', async (req: AuthenticatedRequest, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                TO_CHAR(date_paiement, 'Mon') as mois,
                EXTRACT(MONTH FROM date_paiement) as mois_num,
                SUM(montant) as total 
            FROM payments 
            WHERE date_paiement >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY mois, mois_num 
            ORDER BY mois_num
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

export default router;
