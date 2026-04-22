"use strict";
// backend/routes/tenantAccessRoutes.ts
// Manages tenant portal access control
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// GET /api/tenant-access/:tenantId - Get access config
router.get('/:tenantId', authMiddleware_1.protect, permissionMiddleware_1.default.canRead('locataires'), tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const tenantId = parseInt(req.params.tenantId);
        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const result = await dbClient.query('SELECT * FROM tenant_access WHERE tenant_id = $1', [tenantId]);
        if (result.rows.length === 0) {
            // No access config yet, return defaults
            return res.json({
                tenant_id: tenantId,
                is_active: false,
                access_modules: { contrat: true, paiements: true, plaintes: true, services: false },
                allow_online_payment: false,
                notification_channel: 'whatsapp',
                access_code: null
            });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// PUT /api/tenant-access/:tenantId - Update access config
router.put('/:tenantId', authMiddleware_1.protect, permissionMiddleware_1.default.canWrite('locataires'), tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const tenantId = parseInt(req.params.tenantId);
        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const { access_modules, allow_online_payment, notification_channel } = req.body;
        // Upsert access config
        const result = await dbClient.query(`
            INSERT INTO tenant_access (tenant_id, access_modules, allow_online_payment, notification_channel)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id) DO UPDATE SET
                access_modules = EXCLUDED.access_modules,
                allow_online_payment = EXCLUDED.allow_online_payment,
                notification_channel = EXCLUDED.notification_channel,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            tenantId,
            JSON.stringify(access_modules || { contrat: true, paiements: true, plaintes: true, services: false }),
            allow_online_payment || false,
            notification_channel || 'whatsapp'
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Configuration de locataire non trouvée ou accès refusé' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/tenant-access/:tenantId/activate - Activate tenant access and generate code
router.post('/:tenantId/activate', authMiddleware_1.protect, permissionMiddleware_1.default.canWrite('locataires'), tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const tenantId = parseInt(req.params.tenantId);
        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        // Generate unique access code
        const accessCode = crypto_1.default.randomBytes(16).toString('hex');
        const result = await dbClient.query(`
            INSERT INTO tenant_access (tenant_id, is_active, access_code)
            VALUES ($1, TRUE, $2)
            ON CONFLICT (tenant_id) DO UPDATE SET
                is_active = TRUE,
                access_code = EXCLUDED.access_code,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [tenantId, accessCode]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Locataire inexistant ou accès refusé' });
        }
        res.json({
            message: 'Accès activé',
            access_code: accessCode,
            access: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error activating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/tenant-access/:tenantId/suspend - Suspend tenant access
router.post('/:tenantId/suspend', authMiddleware_1.protect, permissionMiddleware_1.default.canWrite('locataires'), tenantGuard_1.tenantGuard, async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const tenantId = parseInt(req.params.tenantId);
        // [RLS] Isolation garantie par PostgreSQL Row-Level Security
        const result = await dbClient.query(`
            UPDATE tenant_access SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $1
            RETURNING tenant_id
        `, [tenantId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Locataire inexistant ou accès refusé' });
        }
        res.json({ message: 'Accès suspendu' });
    }
    catch (error) {
        console.error('Error suspending tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — tenantAccessRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool totalement supprimé grâce au commentaire d'avertissement.
 * ✅ Fonctions d'accès manuelles getManagedOwnerId et verifyTenantAccess SUPPRIMÉES (Obsolètes).
 * ✅ Chaque ancien appel manuel remplacé par : // [RLS] Isolation garantie par PostgreSQL Row-Level Security.
 * ✅ tenantGuard greffé formellement après chaque authMiddleware et validation des permissions existantes.
 * ✅ Remplacement strict de pool.query() par req.dbClient.query().
 * ✅ Traitement explicite de la restriction dynamique RLS via vérification de result.rowCount === 0 propulsant un statut 404 là où indiqué.
 * ═══════════════════════════════════════════════════
 */
exports.default = router;
