import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { filterByOwner } from '../middleware/ownerIsolation';
import { LeaseService } from '../services/leaseService';

const router = express.Router();

router.get('/', permissions.canRead('locataires'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { statut } = req.query;
        const ownerIds = (req as any).ownerIds;

        const leases = await LeaseService.findAll(ownerIds, { statut: statut as string });

        res.json({ baux: leases });
    } catch (error) {
        console.error('Error fetching leases (baux):', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
