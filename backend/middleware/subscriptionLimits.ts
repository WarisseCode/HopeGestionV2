import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import pool from '../db/database';

/**
 * Fonction helper pour récupérer le statut et les limites du plan actif d'un utilisateur
 */
export async function getUserSubscriptionDetails(userId: number) {
    try {
        const result = await pool.query(
            `SELECT 
                s.id as subscription_id, 
                s.status,
                sp.name as plan_name,
                sp.max_properties,
                sp.max_tenants,
                sp.features
             FROM subscriptions s
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date > CURRENT_TIMESTAMP
             ORDER BY s.created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // Pas d'abonnement actif trouvé (ou expiré), on fallback sur les limites Gratuites théoriques
            // Normalement, à la création du compte, un plan Free a été créé, mais par sécurité :
            return {
                plan_name: 'free',
                max_properties: 3,
                max_tenants: 5,
                features: ['Gestion basique']
            };
        }

        return result.rows[0];
    } catch (error) {
        console.error('Erreur lors de la récupération de la subscription:', error);
        throw error;
    }
}

/**
 * Middleware pour bloquer la création de BIENS (Immeubles + Lots)
 * si la limite du plan est atteinte.
 */
export const checkPropertyLimit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Administrateurs non soumis aux limites
        if (req.userRole === 'admin') {
            return next();
        }

        const sub = await getUserSubscriptionDetails(userId);
        
        // Illimité
        if (sub.max_properties === -1) {
            return next();
        }

        // Compter les lots existants (un immeuble vide compte 0 lot mais l'usage est aux lots)
        // Les "biens" dans l'UI désignent souvent le "lot". Si on compte les "buildings", on limitera trop.
        // On va compter tous les "lots" liés aux propriétaires appartenant au "gestionnaire/user"
        const countQuery = `
            SELECT COUNT(l.id) as total_lots
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            JOIN owner_user ou ON b.owner_id = ou.owner_id
            WHERE ou.user_id = $1 AND ou.is_active = TRUE
        `;
        
        const countResult = await pool.query(countQuery, [userId]);
        const currentCount = parseInt(countResult.rows[0].total_lots);

        if (currentCount >= sub.max_properties) {
             return res.status(403).json({ 
                 message: `Limite atteinte. Votre plan (${sub.plan_name}) permet un maximum de ${sub.max_properties} biens. Passez au plan Pro pour débloquer cette limite.` 
             });
        }

        next();
    } catch (error) {
         console.error('Erreur checkPropertyLimit:', error);
         return res.status(500).json({ message: 'Erreur interne lors de la vérification des limites.' });
    }
};

/**
 * Middleware pour bloquer la création de LOCATAIRES
 * si la limite du plan est atteinte.
 */
export const checkTenantLimit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Non authentifié' });

        // Administrateurs non soumis aux limites
        if (req.userRole === 'admin') {
            return next();
        }

        const sub = await getUserSubscriptionDetails(userId);
        
        // Illimité
        if (sub.max_tenants === -1) {
            return next();
        }

        // Compter les locataires liés à ce gestionnaire
        const countQuery = `
            SELECT COUNT(t.id) as total_tenants
            FROM tenants t
            JOIN owner_user ou ON t.owner_id = ou.owner_id
            WHERE ou.user_id = $1 AND ou.is_active = TRUE
        `;
        
        const countResult = await pool.query(countQuery, [userId]);
        const currentCount = parseInt(countResult.rows[0].total_tenants);

        if (currentCount >= sub.max_tenants) {
             return res.status(403).json({ 
                 message: `Limite atteinte. Votre plan (${sub.plan_name}) permet un maximum de ${sub.max_tenants} locataires. Passez au plan Pro.` 
             });
        }

        next();
    } catch (error) {
         console.error('Erreur checkTenantLimit:', error);
         return res.status(500).json({ message: 'Erreur interne lors de la vérification des limites.' });
    }
};
