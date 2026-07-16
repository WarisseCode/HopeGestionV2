// backend/middleware/maintenanceMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import pool from '../db/database';

/**
 * Middleware de maintenance
 * 
 * Ce middleware vérifie si le mode maintenance est activé dans la base de données.
 * Si activé, il bloque toutes les requêtes sauf :
 * - Les requêtes des utilisateurs avec le rôle 'admin'
 * - Les routes publiques spécifiques (health check, etc.)
 */
export const checkMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Récupérer l'état de maintenance depuis la base de données
        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_mode'"
        );

        const isMaintenanceMode = result.rows.length > 0 && result.rows[0].value === 'true';

        if (!isMaintenanceMode) {
            // Mode maintenance désactivé, continuer normalement
            next();
            return;
        }

        // Mode maintenance activé
        const authReq = req as AuthenticatedRequest;

        // Autoriser les admins à accéder au site même en maintenance
        if (authReq.userRole === 'admin') {
            next();
            return;
        }

        // Routes publiques autorisées même en maintenance
        const publicPaths = [
            '/api/health',
            '/api/public',
            '/api/maintenance/status'
        ];

        const isPublicPath = publicPaths.some(path => req.path.startsWith(path));

        if (isPublicPath) {
            next();
            return;
        }

        // Pour les requêtes API, retourner une erreur 503
        if (req.path.startsWith('/api/')) {
            res.status(503).json({
                message: 'Site en maintenance',
                maintenance: true
            });
            return;
        }

        // Pour les requêtes web, continuer (le frontend gérera l'affichage)
        next();

    } catch (error) {
        console.error('Erreur lors de la vérification du mode maintenance:', error);
        // En cas d'erreur, on continue normalement pour ne pas bloquer le site
        next();
    }
};

/**
 * Endpoint public pour vérifier le statut de maintenance
 * Cette route doit être ajoutée aux routes publiques
 */
export const getMaintenanceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_mode'"
        );

        const isMaintenanceMode = result.rows.length > 0 && result.rows[0].value === 'true';

        res.json({
            maintenance: isMaintenanceMode,
            message: isMaintenanceMode ? 'Site en maintenance' : 'Site opérationnel'
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du statut de maintenance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
