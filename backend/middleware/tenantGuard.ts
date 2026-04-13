// backend/middleware/tenantGuard.ts
import { Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { AuthenticatedRequest } from './authMiddleware';
import pool from '../db/database';

export const tenantGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié. Jeton manquant ou invalide.' });
    }

    const requestedOwnerId = req.headers['x-owner-id'];
    let client: PoolClient | undefined;

    try {
        // Récupérer tous les owner_ids liés à cet utilisateur
        const ownersRes = await pool.query(
            `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`,
            [req.userId]
        );

        const validOwnerIds = ownersRes.rows.map(row => row.owner_id);

        client = await pool.connect();

        // Toujours définir app.current_user_id (utilisé par la politique RLS multi-owner)
        await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [req.userId.toString()]);

        if (validOwnerIds.length === 0) {
            // Aucun owner lié → mode gestionnaire pur (accès via user_id dans RLS)
            await client.query(`SELECT set_config('app.current_owner_id', '', false)`);
            (req as any).resolvedOwnerId = null;

        } else if (requestedOwnerId) {
            // Owner explicitement demandé via header X-Owner-Id
            const parsedRequested = parseInt(requestedOwnerId as string, 10);
            if (!validOwnerIds.includes(parsedRequested)) {
                client.release();
                return res.status(403).json({ success: false, message: 'Accès interdit pour ce propriétaire spécifique.' });
            }
            await client.query(`SELECT set_config('app.current_owner_id', $1, false)`, [parsedRequested.toString()]);
            (req as any).resolvedOwnerId = parsedRequested;

        } else if (validOwnerIds.length === 1) {
            // Un seul owner → mode propriétaire (RLS filtre sur cet owner)
            await client.query(`SELECT set_config('app.current_owner_id', $1, false)`, [validOwnerIds[0].toString()]);
            (req as any).resolvedOwnerId = validOwnerIds[0];

        } else {
            // Plusieurs owners sans sélection explicite → mode gestionnaire multi-owner
            // La politique RLS utilise app.current_user_id pour voir tous les owners gérés
            await client.query(`SELECT set_config('app.current_owner_id', '', false)`);
            (req as any).resolvedOwnerId = null;
        }

        (req as any).dbClient = client;

        // Libération unique du client après la réponse
        let released = false;
        const releaseClient = () => {
            if (!released && client) { released = true; client.release(); }
        };
        res.on('finish', releaseClient);
        res.on('close', releaseClient);

        next();

    } catch (error) {
        console.error('[TenantGuard] Database error:', error);
        if (client) client.release();
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Erreur interne de sécurité (TenantGuard).' });
        }
    }
};

export default tenantGuard;
