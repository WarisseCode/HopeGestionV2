// backend/middleware/tenantGuard.ts
import { Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { AuthenticatedRequest } from './authMiddleware';
import pool from '../db/database';

export const tenantGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. S'exécuter après l'authentification (req.userId doit exister via JWT)
    if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié. Jeton manquant ou invalide.' });
    }

    // [SÉCURITÉ] owner_id accepté uniquement depuis le header X-Owner-Id.
    // req.body.owner_id et req.query.owner_id retirés — vecteur d'injection potentiel.
    const requestedOwnerId = req.headers['x-owner-id'];
    let client: PoolClient | undefined;

    try {
        // 2. Récupérer l'owner_id associé à cet utilisateur EXCLUSIVEMENT depuis la base de données
        const ownersRes = await pool.query(
            `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`,
            [req.userId]
        );

        if (ownersRes.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Accès refusé. Aucun propriétaire assigné.' });
        }

        const validOwnerIds = ownersRes.rows.map(row => row.owner_id);
        let activeOwnerId: number;

        // Cas : L'utilisateur gère plusieurs propriétés ou demande explicitement un owner_id
        if (requestedOwnerId) {
            const parsedRequested = parseInt(requestedOwnerId as string, 10);
            
            // On s'assure que cet utilisateur a réellement accès à ce owner_id via la BD
            if (!validOwnerIds.includes(parsedRequested)) {
                return res.status(403).json({ success: false, message: 'Accès interdit pour ce propriétaire spécifique.' });
            }
            activeOwnerId = parsedRequested;
        } else {
            // S'il n'y a qu'un seul owner_id autorisé on l'utilise automatiquement
            if (validOwnerIds.length === 1) {
                activeOwnerId = validOwnerIds[0];
            } else {
                // S'il y en a plusieurs, il faut obligatoirement nous indiquer lequel
                return res.status(400).json({ 
                    success: false, 
                    message: "Plusieurs propriétaires détectés. L'entête X-Owner-Id est requis." 
                });
            }
        }

        // 3. Ouvrir un client PostgreSQL dédié depuis le pool
        client = await pool.connect();

        // 4. Exécuter set_config() pour l'activer sur cette session précise
        // NOTE: false = session-level (persiste pour toute la connexion dédiée)
        // Sûr car tenantGuard écrase la valeur à chaque nouvelle requête entrante
        // true (LOCAL/transaction-scoped) ne fonctionnait pas : le paramètre était réinitialisé
        // entre set_config et les queries suivantes (chaque query = transaction implicite distincte)
        await client.query(`SELECT set_config('app.current_owner_id', $1, false)`, [activeOwnerId.toString()]);

        // 5. Attacher le client sécurisé à la requête pour être utilisé par les routes
        (req as any).dbClient = client;

        // Utilisé si certaines routes legacy en ont explicitement besoin hors RLS
        (req as any).resolvedOwnerId = activeOwnerId;

        // Libération différée : après que la réponse soit envoyée
        // Guard contre le double-release (finish + close émis tous les deux en fin normale)
        let released = false;
        const releaseClient = () => {
            if (!released && client) { released = true; client.release(); }
        };
        res.on('finish', releaseClient);
        res.on('close', releaseClient);

        // 6. Appeler next() pour passer à la route (sans await)
        next(); 

    } catch (error) {
        console.error('[TenantGuard] Database error:', error);
        // En cas d'erreur dans le guard lui-même (avant next)
        if (client) client.release();
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Erreur interne de sécurité (TenantGuard).' });
        }
    }
};

export default tenantGuard;
