// backend/middleware/maintenanceMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { JWT_SECRET } from '../config/config';
import pool from '../db/database';

// ---------------------------------------------------------------------------
// Cache en mémoire — évite de requêter la DB à chaque appel HTTP
// ---------------------------------------------------------------------------
interface MaintenanceCache {
    enabled: boolean;
    scheduledAt: string | null; // ISO timestamp ou null
    ts: number;
}

let maintenanceCache: MaintenanceCache = { enabled: false, scheduledAt: null, ts: 0 };
const CACHE_TTL_MS = 5_000; // 5 secondes

async function getMaintenanceState(): Promise<{ enabled: boolean; scheduledAt: string | null }> {
    const now = Date.now();

    // Servir depuis le cache si encore frais
    if (now - maintenanceCache.ts < CACHE_TTL_MS) {
        return { enabled: maintenanceCache.enabled, scheduledAt: maintenanceCache.scheduledAt };
    }

    try {
        const [modeRes, schedRes] = await Promise.all([
            pool.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'"),
            pool.query("SELECT value FROM system_settings WHERE key = 'maintenance_scheduled_at'"),
        ]);

        let enabled = modeRes.rows.length > 0 && modeRes.rows[0].value === 'true';
        let scheduledAt: string | null = schedRes.rows.length > 0 ? schedRes.rows[0].value : null;

        // Maintenance programmée dont l'heure est passée → activer automatiquement
        if (!enabled && scheduledAt) {
            const scheduledTime = new Date(scheduledAt).getTime();
            if (scheduledTime <= now) {
                await pool.query(
                    "UPDATE system_settings SET value = 'true', updated_at = NOW() WHERE key = 'maintenance_mode'"
                );
                await pool.query(
                    "UPDATE system_settings SET value = NULL, updated_at = NOW() WHERE key = 'maintenance_scheduled_at'"
                );
                enabled = true;
                scheduledAt = null;
            }
        }

        maintenanceCache = { enabled, scheduledAt, ts: now };
        return { enabled, scheduledAt };
    } catch {
        // Fail-open : si la table n'existe pas encore, maintenance désactivée
        return { enabled: false, scheduledAt: null };
    }
}

/**
 * Invalide le cache (à appeler après chaque toggle ou modification de planning).
 */
export function invalidateMaintenanceCache(): void {
    maintenanceCache = { ...maintenanceCache, ts: 0 };
}

// ---------------------------------------------------------------------------
// Vérification JWT côté serveur (signature vérifiée — pas de forgery possible)
// ---------------------------------------------------------------------------
function decodeJwtRole(authHeader: string): string | null {
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'object' && decoded !== null && 'role' in decoded) {
            const role = (decoded as { role: unknown }).role;
            return typeof role === 'string' ? role : null;
        }
        return null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Génération du token de secours au démarrage (une seule fois)
// ---------------------------------------------------------------------------
export async function ensureEmergencyToken(): Promise<void> {
    try {
        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_emergency_token'"
        );

        // Token déjà généré → rien à faire
        if (result.rows.length > 0 && result.rows[0].value) return;

        // Générer un token lisible : HOPE-XXXXXX-XXXXXX
        const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
        const rawToken = `HOPE-${part1}-${part2}`;

        const hashed = await bcrypt.hash(rawToken, 10);

        await pool.query(
            `INSERT INTO system_settings (key, value, value_type, description, updated_at)
             VALUES ('maintenance_emergency_token', $1, 'string', 'Token de secours hashé pour désactiver la maintenance', NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [hashed]
        );

        // Affiché UNE SEULE FOIS dans les logs — à noter précieusement
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║      TOKEN DE SECOURS MAINTENANCE — À CONSERVER             ║');
        console.log(`║   ${rawToken}                               ║`);
        console.log('║   URL : /maintenance/emergency                               ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log('');
    } catch (err) {
        console.error('[MaintenanceMiddleware] Erreur génération emergency token:', err);
    }
}

// ---------------------------------------------------------------------------
// Middleware principal
// ---------------------------------------------------------------------------
/**
 * Middleware de maintenance.
 *
 * Routes toujours autorisées (même en maintenance) :
 *  - /health
 *  - /public  (inclut /public/maintenance/status et /public/maintenance/emergency-disable)
 *  - /auth    (connexion / déconnexion)
 *  - /admin   (les admins doivent toujours pouvoir accéder à leur espace)
 *  - /invitations
 *
 * Les utilisateurs avec le rôle 'admin' dans leur JWT (signature vérifiée) passent toujours.
 */
export const checkMaintenance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { enabled } = await getMaintenanceState();

        if (!enabled) {
            next();
            return;
        }

        // Admin vérifié côté serveur → accès total
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const role = decodeJwtRole(authHeader);
            if (role === 'admin') {
                next();
                return;
            }
        }

        // Routes toujours accessibles en maintenance
        const allowedPrefixes = ['/health', '/public', '/auth', '/admin', '/invitations'];
        if (allowedPrefixes.some(p => req.path.startsWith(p))) {
            next();
            return;
        }

        res.status(503).json({
            message: 'Site en maintenance. Merci de votre patience.',
            maintenance: true,
        });
    } catch {
        // Fail-open : erreur inattendue → ne pas bloquer
        next();
    }
};

// ---------------------------------------------------------------------------
// Endpoint public GET /api/public/maintenance/status
// Retourne: { enabled, message, scheduledAt }
// ---------------------------------------------------------------------------
export const getMaintenanceStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
        const { enabled, scheduledAt } = await getMaintenanceState();

        let message = 'Site en maintenance. Merci de votre patience.';
        try {
            const msgResult = await pool.query(
                "SELECT value FROM system_settings WHERE key = 'maintenance_message'"
            );
            if (msgResult.rows.length > 0 && msgResult.rows[0].value) {
                message = msgResult.rows[0].value;
            }
        } catch { /* Ignorer */ }

        res.json({ enabled, message, scheduledAt: scheduledAt ?? null });
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ---------------------------------------------------------------------------
// Endpoint public POST /api/public/maintenance/emergency-disable
// Body: { token: string }
// Rate-limit géré par le router (express-rate-limit)
// ---------------------------------------------------------------------------
export const emergencyDisableMaintenance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body as { token?: string };

        if (!token || typeof token !== 'string') {
            res.status(400).json({ message: 'Token requis.' });
            return;
        }

        const result = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'maintenance_emergency_token'"
        );

        if (result.rows.length === 0 || !result.rows[0].value) {
            res.status(500).json({ message: 'Token de secours non configuré.' });
            return;
        }

        const isValid = await bcrypt.compare(token, result.rows[0].value);
        if (!isValid) {
            res.status(401).json({ message: 'Token invalide.' });
            return;
        }

        // Désactiver la maintenance + effacer la programmation
        await pool.query(
            "UPDATE system_settings SET value = 'false', updated_at = NOW() WHERE key = 'maintenance_mode'"
        );
        await pool.query(
            "UPDATE system_settings SET value = NULL, updated_at = NOW() WHERE key = 'maintenance_scheduled_at'"
        );
        invalidateMaintenanceCache();

        // Logger dans audit_logs
        try {
            await pool.query(
                `INSERT INTO audit_logs (action, module, entity_type, entity_id, user_name, details, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    'MAINTENANCE_EMERGENCY_DISABLED',
                    'system',
                    'maintenance_mode',
                    null,
                    'emergency',
                    'Maintenance désactivée via token de secours',
                    req.ip,
                ]
            );
        } catch { /* Non bloquant */ }

        res.json({ message: 'Mode maintenance désactivé avec succès.' });
    } catch (err) {
        console.error('[Emergency disable] Erreur:', err);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};
