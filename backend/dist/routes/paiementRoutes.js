"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const index_1 = require("../index");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const ownerIsolation_1 = require("../middleware/ownerIsolation");
// GET /api/paiements - Liste des paiements (avec filtrage owner)
router.get('/', permissionMiddleware_1.default.canRead('finance'), ownerIsolation_1.filterByOwner, async (req, res) => {
    try {
        const ownerIds = req.ownerIds;
        const whereClause = (0, ownerIsolation_1.buildOwnerWhereClause)(ownerIds);
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
            WHERE ${whereClause.replace(/owner_id/g, 'p.owner_id')}
            ORDER BY p.date_paiement DESC LIMIT 100
        `;
        const result = await index_1.pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur récupération paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// POST /api/paiements - Enregistrer un paiement (Module V: linked to schedule)
router.post('/', permissionMiddleware_1.default.canWrite('finance'), async (req, res) => {
    try {
        const { lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, schedule_id // Module V: Link to specific schedule entry
         } = req.body;
        // 1. Récupérer infos du bail pour owner_id
        const leaseResult = await index_1.pool.query('SELECT owner_id FROM leases WHERE id = $1', [lease_id]);
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: "Bail non trouvé" });
        }
        const owner_id = leaseResult.rows[0].owner_id;
        // 2. Insérer paiement
        const result = await index_1.pool.query(`INSERT INTO payments 
            (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, owner_id, schedule_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`, [lease_id, montant, type, mode_paiement, date_paiement || new Date(), reference_transaction || null, owner_id, schedule_id || null]);
        // 3. Module V: Update schedule if linked
        if (schedule_id) {
            // Get current schedule info - correct column names: total_amount, amount_paid
            const scheduleResult = await index_1.pool.query('SELECT total_amount, amount_paid FROM payment_schedules WHERE id = $1', [schedule_id]);
            if (scheduleResult.rows.length > 0) {
                const schedule = scheduleResult.rows[0];
                const newPaid = parseFloat(schedule.amount_paid || 0) + parseFloat(montant);
                const scheduledAmount = parseFloat(schedule.total_amount);
                let newStatus = 'partiel';
                if (newPaid >= scheduledAmount) {
                    newStatus = 'paye';
                }
                await index_1.pool.query(`UPDATE payment_schedules 
                     SET amount_paid = $1, 
                         statut = $2, 
                         date_reglement_final = CASE WHEN $2 = 'paye' THEN CURRENT_DATE ELSE date_reglement_final END
                     WHERE id = $3`, [newPaid, newStatus, schedule_id]);
            }
        }
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Erreur création paiement:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /api/paiements/stats - Statistiques financières (filtrées par owner)
router.get('/stats', permissionMiddleware_1.default.canRead('finance'), async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;
        let ownerFilter = '';
        const params = [];
        // Filtrage selon le rôle
        if (userRole === 'proprietaire') {
            ownerFilter = ` AND p.owner_id = (SELECT id FROM owners WHERE phone = (SELECT telephone FROM users WHERE id = $1))`;
            params.push(userId);
        }
        else if (userRole === 'gestionnaire' || userRole === 'manager') {
            // Filtrer par propriétaires assignés
            const ownersResult = await index_1.pool.query(`SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`, [userId]);
            if (ownersResult.rows.length > 0) {
                const ownerIds = ownersResult.rows.map(r => r.owner_id);
                ownerFilter = ` AND p.owner_id IN (${ownerIds.join(',')})`;
            }
        }
        // Admin voit tout (pas de filtre)
        // Revenus du mois en cours
        const revenusMois = await index_1.pool.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('month', p.date_paiement) = date_trunc('month', CURRENT_DATE)
            ${ownerFilter}
        `, params);
        // Revenus année
        const revenusAnnee = await index_1.pool.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('year', p.date_paiement) = date_trunc('year', CURRENT_DATE)
            ${ownerFilter}
        `, params);
        res.json({
            mois: revenusMois.rows[0].total || 0,
            annee: revenusAnnee.rows[0].total || 0
        });
    }
    catch (error) {
        console.error('Erreur stats paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /api/paiements/history - Historique sur 6 mois (filtré par owner)
router.get('/history', permissionMiddleware_1.default.canRead('finance'), async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;
        let ownerFilter = '';
        const params = [];
        // Filtrage selon le rôle
        if (userRole === 'proprietaire') {
            ownerFilter = ` AND p.owner_id = (SELECT id FROM owners WHERE phone = (SELECT telephone FROM users WHERE id = $1))`;
            params.push(userId);
        }
        else if (userRole === 'gestionnaire' || userRole === 'manager') {
            // Filtrer par propriétaires assignés
            const ownersResult = await index_1.pool.query(`SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`, [userId]);
            if (ownersResult.rows.length > 0) {
                const ownerIds = ownersResult.rows.map(r => r.owner_id);
                ownerFilter = ` AND p.owner_id IN (${ownerIds.join(',')})`;
            }
        }
        // Admin voit tout (pas de filtre)
        const result = await index_1.pool.query(`
            SELECT 
                TO_CHAR(p.date_paiement, 'Mon') as mois,
                EXTRACT(MONTH FROM p.date_paiement) as mois_num,
                COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE p.date_paiement >= CURRENT_DATE - INTERVAL '6 months'
            ${ownerFilter}
            GROUP BY mois, mois_num 
            ORDER BY mois_num
        `, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur historique paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
exports.default = router;
