"use strict";
// backend/routes/depenseRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais déduit du client.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const tenantGuard_1 = require("../middleware/tenantGuard");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
// GET /api/depenses - Liste des dépenses filtrées par RLS
router.get('/', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        // [RLS] PostgreSQL filtre automatiquement par owner_id via get_current_owner_id()
        const result = await dbClient.query(`
            SELECT e.*,
                   b.nom as building_name,
                   l.ref_lot,
                   o.name as owner_name
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN owners o ON e.owner_id = o.id
            ORDER BY e.date_expense DESC LIMIT 100
        `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur récupération dépenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/depenses - Enregistrer une dépense
// [SÉCURITÉ] owner_id depuis resolvedOwnerId uniquement — jamais depuis le client.
// Le RLS garantit que building_id/lot_id appartiennent bien au tenant actif.
router.post('/', permissionMiddleware_1.default.canWrite('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        const { building_id, lot_id, category, description, amount, date_expense, supplier_name, proof_url } = req.body;
        if (!category || !amount) {
            return res.status(400).json({ message: 'Catégorie et montant requis.' });
        }
        const result = await dbClient.query(`INSERT INTO expenses
             (building_id, lot_id, owner_id, category, description, amount, date_expense, supplier_name, proof_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`, [
            building_id || null,
            lot_id || null,
            ownerId, // [SÉCURITÉ] jamais req.body.owner_id
            category,
            description || null,
            amount,
            date_expense || new Date(),
            supplier_name || null,
            proof_url || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Erreur création dépense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/depenses/stats - Statistiques dépenses filtrées par RLS
router.get('/stats', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        // [RLS] Pas de WHERE owner_id manuel — PostgreSQL l'applique automatiquement
        const depensesMois = await dbClient.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE date_trunc('month', date_expense) = date_trunc('month', CURRENT_DATE)
        `);
        const depensesAnnee = await dbClient.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE date_trunc('year', date_expense) = date_trunc('year', CURRENT_DATE)
        `);
        res.json({
            mois: depensesMois.rows[0].total || 0,
            annee: depensesAnnee.rows[0].total || 0
        });
    }
    catch (error) {
        console.error('Erreur stats dépenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/depenses/history - Historique sur 6 mois filtré par RLS
router.get('/history', permissionMiddleware_1.default.canRead('finance'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        // [RLS] Pas de WHERE owner_id manuel — PostgreSQL l'applique automatiquement
        const result = await dbClient.query(`
            SELECT
                TO_CHAR(date_expense, 'Mon') as mois,
                EXTRACT(MONTH FROM date_expense) as mois_num,
                COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE date_expense >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY mois, mois_num
            ORDER BY mois_num
        `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur historique dépenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
