import { PoolClient } from 'pg';

/**
 * Portée propriétaire de l'appelant. Paramètre OBLIGATOIRE de findAll : un
 * oubli doit être une erreur de compilation, pas une fuite silencieuse.
 * - isAdmin = true  → accès global (aucune clause)
 * - isAdmin = false → `l.owner_id = ANY(validOwnerIds)` (tableau vide → 0 ligne)
 */
export interface LeaseOwnerScope {
    isAdmin: boolean;
    validOwnerIds: number[];
}

export class LeaseService {
    /**
     * Retrieve all leases filtered by owner access and optional status.
     * @param dbClient - The isolated PostgreSQL client (tenantGuard).
     * @param scope - Owner scope of the caller (admin bypass or validOwnerIds).
     * @param filters - Optional filters (e.g., status).
     */
    static async findAll(dbClient: PoolClient, scope: LeaseOwnerScope, filters: { statut?: string; page?: number; limit?: number } = {}) {
        // [SÉCURITÉ] `leases` n'a pas de politique RLS versionnée et le rôle DB peut
        // avoir BYPASSRLS : la RLS ne protège pas. Filtre explicite par propriétaire
        // (même pattern que scopeByOwner dans leaseRoutes.ts), sauf pour l'admin.
        let query = `
            SELECT
                l.id,
                l.reference_bail,
                l.lot_id,
                l.tenant_id,
                l.date_debut,
                l.date_fin,
                l.loyer_actuel as loyer_mensuel,
                l.caution,
                l.avance,
                l.charges_mensuelles,
                l.type_charges,
                l.statut,
                l.devise,
                l.type_paiement,
                l.jour_echeance,
                l.duree_contrat,
                l.contrat_genere,
                l.type_contrat,
                l.prix_vente,
                l.conditions_particulieres,
                l.created_at,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                t.telephone_principal as locataire_telephone,
                t.photo_profil_url as locataire_photo,
                lot.ref_lot,
                lot.type as lot_type,
                b.nom as immeuble_nom,
                o.name as proprietaire_nom,
                o.id as owner_id
            FROM leases l
            LEFT JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lot ON l.lot_id = lot.id
            LEFT JOIN buildings b ON lot.building_id = b.id
            LEFT JOIN owners o ON l.owner_id = o.id
            WHERE 1=1 AND l.deleted_at IS NULL
        `;

        const params: any[] = [];

        if (!scope.isAdmin) {
            params.push(scope.validOwnerIds || []);
            query += ` AND l.owner_id = ANY($${params.length}::int[])`;
        }

        if (filters.statut) {
            params.push(filters.statut);
            query += ` AND l.statut = $${params.length}`;
        }

        query += ` ORDER BY l.created_at DESC`;

        // Pagination optionnelle
        if (filters.page !== undefined && filters.limit !== undefined) {
            const safeLimit = Math.min(Math.max(1, filters.limit), 200);
            const offset    = (Math.max(1, filters.page) - 1) * safeLimit;

            // COUNT sur la meme base (memes filtres)
            const countBase = query.replace(/^\s*SELECT[\s\S]*?FROM\s+/i, 'SELECT COUNT(*) FROM ');
            const countRes  = await dbClient.query(countBase, params);
            const total     = parseInt(countRes.rows[0].count, 10);

            const dataRes = await dbClient.query(
                `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                [...params, safeLimit, offset]
            );

            return {
                leases: dataRes.rows,
                total,
                page: filters.page,
                totalPages: Math.ceil(total / safeLimit),
            };
        }

        // Sans pagination -> retrocompatible
        const result = await dbClient.query(query, params);
        return { leases: result.rows, total: result.rows.length, page: 1, totalPages: 1 };
    }
}
