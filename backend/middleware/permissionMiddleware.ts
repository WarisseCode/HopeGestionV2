// backend/middleware/permissionMiddleware.ts
// Middleware to enforce granular permissions from permission_matrix table

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import pool from '../db/database';
import { cache, TTL } from '../utils/cache';

type PermissionAction = 'read' | 'write' | 'delete' | 'validate';

export const checkPermission = (module: string, action: PermissionAction) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userRole = req.userRole;

            // Admin always has full access — no DB hit needed.
            if (userRole === 'admin') return next();

            const columnName = `can_${action}`;
            const cacheKey   = `perm:${userRole}:${module}:${action}`;

            // Try cache first; fall back to DB on miss.
            let hasPermission = cache.get<boolean>(cacheKey);

            if (hasPermission === undefined) {
                const result = await pool.query(
                    `SELECT ${columnName} FROM permission_matrix WHERE role = $1 AND module = $2`,
                    [userRole, module]
                );

                if (result.rows.length === 0) {
                    console.warn(`[PERM] No entry for role='${userRole}' module='${module}'`);
                    cache.set(cacheKey, false, TTL.PERMISSIONS);
                    return res.status(403).json({
                        message: `Accès refusé. Vous n'avez pas la permission de ${getActionLabel(action)} dans ce module.`,
                        requiredPermission: { module, action },
                    });
                }

                hasPermission = Boolean(result.rows[0][columnName]);
                cache.set(cacheKey, hasPermission, TTL.PERMISSIONS);
            }

            if (!hasPermission) {
                console.warn(`[PERM] Denied ${action} on ${module} for role '${userRole}'`);
                return res.status(403).json({
                    message: `Accès refusé. Vous n'avez pas la permission de ${getActionLabel(action)} dans ce module.`,
                    requiredPermission: { module, action },
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Erreur lors de la vérification des permissions.' });
        }
    };
};

export const permissions = {
    canRead:     (module: string) => checkPermission(module, 'read'),
    canWrite:    (module: string) => checkPermission(module, 'write'),
    canDelete:   (module: string) => checkPermission(module, 'delete'),
    canValidate: (module: string) => checkPermission(module, 'validate'),
};

function getActionLabel(action: PermissionAction): string {
    switch (action) {
        case 'read':     return 'consulter les données';
        case 'write':    return 'modifier les données';
        case 'delete':   return 'supprimer des éléments';
        case 'validate': return 'valider des actions';
        default:         return 'effectuer cette action';
    }
}

export default permissions;
