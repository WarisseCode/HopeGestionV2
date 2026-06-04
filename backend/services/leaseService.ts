import { PoolClient } from 'pg';

export class LeaseService {
    /**
     * Retrieve all leases filtered by owner access and optional status.
     * @param dbClient - The isolated PostgreSQL client configured with RLS.
     * @param filters - Optional filters (e.g., status).
     */
    static async findAll(dbClient: PoolClient, filters: { statut?: string } = {}) {
        // [RLS] Filtrage automatique par tenant via PostgreSQL Row-Level Security. 
        // Inutile de récupérer ni d'appliquer un ownerIds.
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
            WHERE 1=1
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (filters.statut) {
            query += ` AND l.statut = $${paramIndex}`;
            params.push(filters.statut);
            paramIndex++;
        }

        query += ` ORDER BY l.created_at DESC`;

        const result = await dbClient.query(query, params);

        return result.rows;
    }
}
