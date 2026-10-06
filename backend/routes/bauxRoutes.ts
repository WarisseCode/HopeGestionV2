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
// [SÉCURITÉ] LeaseService.findAll exige la portée propriétaire (admin ou validOwnerIds)
router.get('/', permissions.canRead('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { statut } = req.query;
        // [SÉCURITÉ] Filtre par propriétaire explicite (leases sans RLS versionnée) :
        // même correctif que GET /api/locations.
        const leases = await LeaseService.findAll(dbClient, {
            isAdmin: (req as any).userRole === 'admin',
            validOwnerIds: (req as any).validOwnerIds || [],
        }, { statut: statut as string });
        res.json({ baux: leases });
    } catch (error) {
        console.error('Error fetching leases (baux):', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
