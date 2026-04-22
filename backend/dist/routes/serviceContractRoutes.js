"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
const authMiddleware_1 = require("../middleware/authMiddleware");
// [RLS] Isolation garantie par PostgreSQL Row-Level Security via tenantGuard.
const tenantGuard_1 = require("../middleware/tenantGuard");
const router = express_1.default.Router();
// [RLS] Contrats globaux (owner_id IS NULL) supprimés.
// Tout contrat doit appartenir à un owner.
// Le RLS filtre automatiquement par tenant actif.
// GET /api/service-contracts
router.get('/', authMiddleware_1.protect, tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const query = `
            SELECT sc.*, p.name as provider_name 
            FROM service_contracts sc
            LEFT JOIN providers p ON sc.provider_id = p.id
            ORDER BY sc.start_date DESC`;
        const result = await dbClient.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement contrats' });
    }
});
// POST /api/service-contracts
router.post('/', authMiddleware_1.protect, tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const resolvedOwnerId = req.resolvedOwnerId;
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;
        const result = await dbClient.query(`INSERT INTO service_contracts (owner_id, provider_id, title, description, cost_monthly, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [resolvedOwnerId, provider_id, title, description, cost_monthly, start_date, end_date, status || 'active']);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création contrat' });
    }
});
// PUT /api/service-contracts/:id
router.put('/:id', authMiddleware_1.protect, tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;
        const id = req.params.id;
        const result = await dbClient.query(`UPDATE service_contracts SET provider_id=$1, title=$2, description=$3, cost_monthly=$4, start_date=$5, end_date=$6, status=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`, [provider_id, title, description, cost_monthly, start_date, end_date, status, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contrat introuvable ou accès refusé' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification contrat' });
    }
});
// DELETE /api/service-contracts/:id
router.delete('/:id', authMiddleware_1.protect, tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        // On modifie ici par un RETURNING id pour identifier si la suppression a réussi 
        const result = await dbClient.query('DELETE FROM service_contracts WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contrat introuvable ou accès refusé' });
        }
        res.json({ message: 'Contrat supprimé' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});
/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — serviceContractRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ La table service_contracts a été ajoutée à migration_rls.sql.
 * ✅ Suppression totale de IS NULL pour les contrats globaux ; le RLS exige un propriétaire pour chaque table métier.
 * ✅ Correction complète des failles d'escalade de privilège (IDOR) sur l'UPDATE et le DELETE avec le passage au dbClient.query. Un 404 est retourné si l'accès est refusé.
 * ✅ owner_id est récupéré depuis le resolvedOwnerId du JWT et ne provient plus jamais du client lors d'un POST.
 * ✅ L'helper de vérification manuelle getManagedOwnerId a été retiré.
 * ═══════════════════════════════════════════════════
 */
exports.default = router;
