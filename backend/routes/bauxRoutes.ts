// backend/routes/bauxRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser filterByOwner (legacy).
// LeaseService.findAll utilise req.dbClient (RLS actif via tenantGuard).

import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { LeaseService } from '../services/leaseService';

const router = express.Router();

// GET /api/baux — Liste des baux pour le tenant actif
// [SÉCURITÉ] filterByOwner + ownerIds supprimés — LeaseService.findAll utilise dbClient (RLS)
router.get('/', permissions.canRead('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { statut } = req.query;
        const leases = await LeaseService.findAll(dbClient, { statut: statut as string });
        res.json({ baux: leases });
    } catch (error) {
        console.error('Error fetching leases (baux):', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
