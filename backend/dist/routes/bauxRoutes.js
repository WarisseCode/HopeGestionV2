"use strict";
// backend/routes/bauxRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser filterByOwner (legacy).
// LeaseService.findAll utilise req.dbClient (RLS actif via tenantGuard).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
const leaseService_1 = require("../services/leaseService");
const router = express_1.default.Router();
// GET /api/baux — Liste des baux pour le tenant actif
// [SÉCURITÉ] filterByOwner + ownerIds supprimés — LeaseService.findAll utilise dbClient (RLS)
router.get('/', permissionMiddleware_1.default.canRead('locataires'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        const { statut } = req.query;
        const leases = await leaseService_1.LeaseService.findAll(dbClient, { statut: statut });
        res.json({ baux: leases });
    }
    catch (error) {
        console.error('Error fetching leases (baux):', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
