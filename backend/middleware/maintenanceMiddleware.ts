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
 * Décode le payload JWT sans vérifier la signature.
 * Utilisé uniquement pour lire le rôle — la sécurité reste assurée par le middleware protect.
 */
function decodeJwtRole(authHeader: string): string | null {
    try {
        const parts = authHeader.replace('Bearer ', '').split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return typeof payload.role === 'string' ? payload.role : null;
    } catch {
        return null;
    }
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
 *
 * Les utilisateurs avec le rôle 'admin' dans leur JWT passent toujours, quelle que soit la route.
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

        // Si l'utilisateur est admin, il passe toujours (toutes les routes)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const role = decodeJwtRole(authHeader);
            if (role === 'admin') {
                next();
                return;
            }
        }

        // Chemins toujours accessibles en maintenance pour les non-admins
        const allowedPrefixes = [
            '/health',
            '/public',
            '/auth',
            '/admin',
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

        res.json({ enabled, message });
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
