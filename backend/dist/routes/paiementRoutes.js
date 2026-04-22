"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/paiementRoutes.ts
const express_1 = __importDefault(require("express"));
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
const router = express_1.default.Router();
// [RLS] Filtrage automatique par tenant via PostgreSQL Row-Level Security
// Anciens helpers (filterByOwner, buildOwnerWhereClause, vérifications de rôle manuelles) supprimés.
// GET /api/paiements - Liste des paiements
router.get('/', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
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
            ORDER BY p.date_paiement DESC LIMIT 100
        `;
        const result = await dbClient.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur récupération paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// POST /api/paiements - Enregistrer un paiement (Module V: linked to schedule)
router.post('/', permissionMiddleware_1.default.canWrite('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const strictOwnerId = req.resolvedOwnerId;
    try {
        const { lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, schedule_id // Module V: Link to specific schedule entry
         } = req.body;
        // 1. Vérifier l'existence du bail (RLS garantit qu'il appartient bien à ce tenant)
        const leaseResult = await dbClient.query('SELECT id FROM leases WHERE id = $1', [lease_id]);
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: "Bail non trouvé ou accès refusé." });
        }
        let paymentResult;
        await dbClient.query('BEGIN');
        try {
            // 2. Insérer paiement
            const result = await dbClient.query(`INSERT INTO payments 
                (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, owner_id, schedule_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`, [lease_id, montant, type, mode_paiement, date_paiement || new Date(), reference_transaction || null, strictOwnerId, schedule_id || null]);
            paymentResult = result.rows[0];
            // 3. Module V: Update schedule if linked
            if (schedule_id) {
                // Get current schedule info - correct column names: total_amount, amount_paid
                const scheduleResult = await dbClient.query('SELECT total_amount, amount_paid FROM payment_schedules WHERE id = $1', [schedule_id]);
                if (scheduleResult.rows.length > 0) {
                    const schedule = scheduleResult.rows[0];
                    const newPaid = parseFloat(schedule.amount_paid || 0) + parseFloat(montant);
                    const scheduledAmount = parseFloat(schedule.total_amount);
                    let newStatus = 'partiel';
                    if (newPaid >= scheduledAmount) {
                        newStatus = 'paye';
                    }
                    const updateRes = await dbClient.query(`UPDATE payment_schedules 
                         SET amount_paid = $1, 
                             statut = $2, 
                             date_reglement_final = CASE WHEN $2 = 'paye' THEN CURRENT_DATE ELSE date_reglement_final END
                         WHERE id = $3
                         RETURNING id`, [newPaid, newStatus, schedule_id]);
                    if (updateRes.rowCount === 0) {
                        throw new Error("Impossible de mettre à jour l'échéance de paiement : accès refusé ou ressource introuvable.");
                    }
                }
                else {
                    throw new Error("L'échéance spécifiée n'existe pas ou l'accès est refusé (RLS).");
                }
            }
            await dbClient.query('COMMIT');
            res.status(201).json(paymentResult);
        }
        catch (txError) {
            await dbClient.query('ROLLBACK');
            throw txError;
        }
    }
    catch (error) {
        console.error('Erreur création paiement:', error);
        res.status(500).json({ message: error.message || "Erreur serveur" });
    }
});
// GET /api/paiements/stats - Statistiques financières
router.get('/stats', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        // [PATTERN RLS] Les filtrages manuels par rôle et ownership qui prenaient 20 lignes sont désormais obsolètes !
        // Revenus du mois en cours
        const revenusMois = await dbClient.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('month', p.date_paiement) = date_trunc('month', CURRENT_DATE)
        `);
        // Revenus année
        const revenusAnnee = await dbClient.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('year', p.date_paiement) = date_trunc('year', CURRENT_DATE)
        `);
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
// GET /api/paiements/history - Historique sur 6 mois
router.get('/history', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        // [PATTERN RLS] Pareil ici, le filtrage ownerFilter est maintenant 100% natif.
        const result = await dbClient.query(`
            SELECT 
                TO_CHAR(p.date_paiement, 'Mon') as mois,
                EXTRACT(MONTH FROM p.date_paiement) as mois_num,
                COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE p.date_paiement >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY mois, mois_num 
            ORDER BY mois_num
        `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur historique paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — paiementRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par le commentaire d'avertissement.
 * ✅ tenantGuard ajouté sur toutes les routes de paiementRoutes.ts (4 routes).
 * ✅ pool.query() remplacé par req.dbClient.query() sur 8 occurrences.
 * ✅ resolvedOwnerId utilisé pour le champ owner_id centralisé dans le INSERT (POST /).
 * ✅ Anciens accès manuels massifs liés aux rôles supprimés: les blocs conditionnels (if role === 'gestionnaire') construisant le 'ownerFilter' (~ 40 lignes) ont été jetés !
 * ✅ Réponse 404/protection ajoutée en cas de refus RLS. Si la MAJ asynchrone du schedule_id échoue ou n'affecte aucune ligne, ça gère la protection sereinement.
 * ⚠️ Points d'attention particuliers : Aucun service externe identifié ni générateur de PDF. Tout est géré proprement en base limit.
 * ═══════════════════════════════════════════════════
 */
exports.default = router;
