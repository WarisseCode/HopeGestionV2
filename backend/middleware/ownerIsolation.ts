// backend/middleware/ownerIsolation.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import db from '../db/database';

/**
 * Middleware pour vérifier l'accès d'un utilisateur à un propriétaire
 * Utilisé sur les routes qui nécessitent owner_id
 */
export const checkOwnerAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;
        const ownerId = req.params.id || req.body.owner_id || req.query.owner_id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Non authentifié' 
            });
        }

        if (!ownerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'owner_id requis' 
            });
        }

        // Admin et Manager ont accès à tous les propriétaires
        if (userRole === 'admin' || userRole === 'manager' || userRole === 'gestionnaire') {
            return next();
        }

        // Vérifier si l'utilisateur a accès à ce propriétaire
        const accessResult = await db.query(
            `SELECT 1 FROM owner_user 
             WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
            [ownerId, userId]
        );

        if (accessResult.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Accès refusé à ce propriétaire' 
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkOwnerAccess middleware:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * Middleware pour filtrer automatiquement les requêtes par owner_id
 * Ajoute une clause WHERE owner_id IN (...) aux requêtes
 */
export const filterByOwner = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Non authentifié' 
            });
        }

        // Admin et Manager voient tout
        if (userRole === 'admin' || userRole === 'manager' || userRole === 'gestionnaire') {
            (req as any).ownerIds = null; // null = tous les propriétaires
            return next();
        }

        // Récupérer les propriétaires accessibles par l'utilisateur
        const ownersResult = await db.query(
            `SELECT DISTINCT owner_id FROM owner_user 
             WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        const ownerIds = ownersResult.rows.map(o => o.owner_id);

        // Si aucun propriétaire, on laisse passer mais la clause WHERE sera 1=0 (donc vide)
        // On ne renvoie PAS 403 ici pour permettre à l'UI d'afficher une liste vide propre.
        
        // Stocker les owner_ids dans la requête pour utilisation ultérieure
        (req as any).ownerIds = ownerIds;
        next();
    } catch (error) {
        console.error('Error in filterByOwner middleware:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * Middleware pour vérifier les permissions spécifiques
 */
export const checkPermission = (permission: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            const userRole = req.userRole;
            const ownerId = req.params.id || req.body.owner_id || req.query.owner_id;

            // Admin a toutes les permissions
            if (userRole === 'admin') {
                return next();
            }

            // Vérifier la permission spécifique
            // Note: On utilise une requête dynamique ici, mais le nom de la colonne est contrôlé par le code, pas par l'utilisateur
            const result = await db.query(
                `SELECT ${permission} FROM owner_user 
                 WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
                [ownerId, userId]
            );

            if (result.rows.length === 0 || !result.rows[0][permission]) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Permission refusée: ${permission}` 
                });
            }

            next();
        } catch (error) {
            console.error('Error in checkPermission middleware:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    };
};

/**
 * Helper function pour construire une clause WHERE avec owner_id
 */
export const buildOwnerWhereClause = (ownerIds: number[] | null): string => {
    if (ownerIds === null) {
        return '1=1'; // Pas de filtre (admin/manager)
    }
    
    if (ownerIds.length === 0) {
        return '1=0'; // Aucun accès
    }
    
    return `owner_id IN (${ownerIds.join(',')})`;
};

export default {
    checkOwnerAccess,
    filterByOwner,
    checkPermission,
    buildOwnerWhereClause
};
