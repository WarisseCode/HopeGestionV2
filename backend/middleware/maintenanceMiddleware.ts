// backend/middleware/maintenanceMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import pool from '../db/database';

// Cache en mémoire pour éviter de requêter la DB à chaque appel
let maintenanceCache: { enabled: boolean; ts: number } = { enabled: false, ts: 0 };
const CACHE_TTL_MS = 2_000; // 2 secondes

async function isMaintenanceEnabled(): Promise<boolean> {
    const now = Date.now();
    if (now - maintenanceCache.ts < CACHE_TTL_MS) {
        return maintenanceCache.enabled;
    }

    try {
        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_mode'"
        );
        const enabled = result.rows.length > 0 && result.rows[0].value === 'true';
        maintenanceCache = { enabled, ts: now };
        return enabled;
    } catch {
        // Si la table n'existe pas encore, maintenance désactivée par défaut
        return false;
    }
}

/**
 * Invalide le cache de maintenance (à appeler quand on toggle la maintenance).
 */
export function invalidateMaintenanceCache(): void {
    maintenanceCache = { enabled: maintenanceCache.enabled, ts: 0 };
}

/**
 * Middleware de maintenance.
 *
 * Routes toujours autorisées (même en maintenance) :
 *  - /health
 *  - /public  (inclut /public/maintenance/status)
 *  - /auth    (connexion / déconnexion)
 *  - /admin   (les admins doivent toujours pouvoir se connecter et désactiver la maintenance)
 *  - /invitations
 */
export const checkMaintenance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const maintenance = await isMaintenanceEnabled();

        if (!maintenance) {
            next();
            return;
        }

        // Chemins toujours accessibles en maintenance
        const allowedPrefixes = [
            '/health',
            '/public',
            '/auth',
            '/admin',       // ← les admins passent via leur propre route
            '/invitations',
        ];

        const isAllowed = allowedPrefixes.some(prefix => req.path.startsWith(prefix));

        if (isAllowed) {
            next();
            return;
        }

        // Toutes les autres routes → 503
        res.status(503).json({
            message: 'Site en maintenance. Merci de votre patience.',
            maintenance: true,
        });
    } catch {
        // En cas d'erreur, ne pas bloquer
        next();
    }
};

/**
 * Endpoint public pour connaître le statut de maintenance.
 * Monté sur GET /api/public/maintenance/status
 */
export const getMaintenanceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_mode'"
        );
        const enabled = result.rows.length > 0 && result.rows[0].value === 'true';

        let message = 'Site en maintenance. Merci de votre patience.';
        try {
            const msgResult = await pool.query(
                "SELECT value FROM system_settings WHERE key = 'maintenance_message'"
            );
            if (msgResult.rows.length > 0) {
                message = msgResult.rows[0].value;
            }
        } catch {
            // Ignorer si le message personnalisé n'existe pas
        }

        res.json({ maintenance: enabled, message });
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
