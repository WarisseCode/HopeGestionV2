"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const ownerIsolation_1 = require("../middleware/ownerIsolation");
const leaseService_1 = require("../services/leaseService");
const router = express_1.default.Router();
router.get('/', permissionMiddleware_1.default.canRead('locataires'), ownerIsolation_1.filterByOwner, async (req, res) => {
    try {
        const { statut } = req.query;
        const ownerIds = req.ownerIds;
        const leases = await leaseService_1.LeaseService.findAll(ownerIds, { statut: statut });
        res.json({ baux: leases });
    }
    catch (error) {
        console.error('Error fetching leases (baux):', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
