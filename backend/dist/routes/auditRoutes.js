"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const AuditService_1 = require("../services/AuditService");
const router = express_1.default.Router();
/**
 * GET /api/audit-logs
 * Protected route: Only accessible by 'gestionnaire' or 'admin'.
 * Query Params:
 * - userId: Filter by user ID
 * - action: Filter by action type
 * - limit: Number of records (default 50)
 * - offset: Pagination offset
 */
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        // RPAC Check: Only Manager or Admin
        const userRole = req.user.role; // Assuming role is stored in token/user object
        const userType = req.user.userType; // Or userType
        // Allow if role is admin OR userType is gestionnaire
        const isAuthorized = userRole === 'admin' || userType === 'gestionnaire' || req.user.is_super_admin;
        if (!isAuthorized) {
            // Log unauthorized access attempt?
            return res.status(403).json({ message: "Accès refusé. Réservé aux administrateurs." });
        }
        const { userId, action, limit, offset } = req.query;
        const logs = await AuditService_1.AuditService.getLogs({
            userId: userId,
            action: action,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });
        res.json({ logs });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=auditRoutes.js.map