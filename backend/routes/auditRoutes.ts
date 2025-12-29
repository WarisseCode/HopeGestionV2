import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { AuditService } from '../services/AuditService';

const router = express.Router();

/**
 * GET /api/audit-logs
 * Protected route: Only accessible by 'gestionnaire' or 'admin'.
 * Query Params:
 * - userId: Filter by user ID
 * - action: Filter by action type
 * - limit: Number of records (default 50)
 * - offset: Pagination offset
 */
router.get('/', protect, async (req: any, res) => {
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

        const logs = await AuditService.getLogs({
            userId: userId as string,
            action: action as string,
            limit: limit ? parseInt(limit as string) : 50,
            offset: offset ? parseInt(offset as string) : 0
        });

        res.json({ logs });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
