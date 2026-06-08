// backend/routes/dashboardRoutes.ts
// Routes HTTP pures — contexte extrait de req, délégation à DashboardService, res.json().

import { Router, Response } from 'express';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { DashboardService } from '../services/DashboardService';

dotenv.config();

const router = Router();

// GET /api/dashboard/stats/gestionnaire
router.get('/stats/gestionnaire', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    if (!['gestionnaire', 'admin', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, lotsOccupes: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0, locatairesActifs: 0 }
            });
        }
        const stats = await DashboardService.getOwnerStats(dbClient, validOwnerIds, isAdmin, 'gestionnaire');
        res.status(200).json({ stats });
    } catch (error) {
        console.error('Erreur récupération stats gestionnaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/stats/manager
router.get('/stats/manager', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    if (!['gestionnaire', 'admin', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, lotsOccupes: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0, locatairesActifs: 0 }
            });
        }
        const stats = await DashboardService.getOwnerStats(dbClient, validOwnerIds, isAdmin, 'manager');
        res.status(200).json({ stats });
    } catch (error) {
        console.error('Erreur récupération stats manager:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/stats/proprietaire
router.get('/stats/proprietaire', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    if (!['proprietaire', 'gestionnaire', 'admin'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    try {
        if (validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0 }
            });
        }
        const stats = await DashboardService.getProprietaireStats(dbClient, validOwnerIds[0] as number);
        res.status(200).json({ stats });
    } catch (error) {
        console.error('Erreur récupération stats propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/stats/locataire
router.get('/stats/locataire', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'locataire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient = (req as any).dbClient;
    try {
        const stats = await DashboardService.getLocataireStats(dbClient, req.userId!);
        res.status(200).json({ stats });
    } catch (error) {
        console.error('Erreur récupération stats locataire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/kpi
router.get('/kpi', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                kpis: [],
                summary: {
                    totalBiens: 0, totalLots: 0, lotsOccupes: 0, lotsLibres: 0,
                    tauxOccupation: 0, loyersEncaisses: 0, loyersImpayes: 0,
                    contratsActifs: 0, plaintesOuvertes: 0, reservationsEnAttente: 0,
                    montantARecouvrer: 0, echelonementsEnRetard: 0
                }
            });
        }
        const result = await DashboardService.getKPIs(dbClient, validOwnerIds, isAdmin);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erreur récupération KPIs:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des KPIs.' });
    }
});

// GET /api/dashboard/chart-data
router.get('/chart-data', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    const period  = (req.query.period as string) || '6m';
    try {
        const result = await DashboardService.getChartData(dbClient, validOwnerIds, isAdmin, period);
        res.json(result);
    } catch (error) {
        console.error('Erreur récupération chart-data:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/activity
router.get('/activity', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        const activities = await DashboardService.getActivity(
            dbClient, validOwnerIds, isAdmin, req.userRole!, req.userId!
        );
        res.json({ activities });
    } catch (error) {
        console.error('Error fetching dashboard activity:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// GET /api/dashboard/featured-properties
router.get('/featured-properties', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.json({ properties: [] });
        }
        const properties = await DashboardService.getFeaturedProperties(dbClient, validOwnerIds, isAdmin);
        res.json({ properties });
    } catch (error) {
        console.error('Error fetching featured properties:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;
