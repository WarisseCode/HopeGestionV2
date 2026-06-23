// backend/services/TrashService.ts
// Module Corbeille (CdC §XVII) — soft-delete transverse.
// Un registre décrit chaque module : table, libellé de l'élément, et stratégie d'isolation.
// La liste/restauration/suppression définitive sont génériques et owner/user-scopées.

import { PoolClient } from 'pg';

// Stratégie d'isolation d'un module :
//  - 'owner' : ligne rattachée à un propriétaire (colonne owner_id) ;
//  - 'user'  : ligne rattachée à des utilisateurs (ex. tâches/messages).
type Scope =
    | { kind: 'owner' }
    | { kind: 'user'; cols: string[] };

export interface TrashModule {
    module: string;     // clé CdC (biens, locataires, contrats, …)
    moduleLabel: string;
    typeLabel: string;  // type affiché d'un élément (Immeuble, Lot, Locataire…)
    table: string;
    labelExpr: string;  // expression SQL produisant le "Nom" de l'élément (alias t)
    scope: Scope;
}

// ⚠️ labelExpr n'utilise QUE des colonnes existantes confirmées (sinon la requête planterait).
export const TRASH_MODULES: TrashModule[] = [
    { module: 'biens',         moduleLabel: 'Biens',           typeLabel: 'Immeuble',     table: 'buildings',       labelExpr: "COALESCE(t.nom, 'Immeuble #' || t.id)",                                  scope: { kind: 'owner' } },
    { module: 'lots',          moduleLabel: 'Lots',            typeLabel: 'Lot',          table: 'lots',            labelExpr: "COALESCE(t.ref_lot, 'Lot #' || t.id)",                                   scope: { kind: 'owner' } },
    { module: 'locataires',    moduleLabel: 'Locataires',      typeLabel: 'Locataire',    table: 'tenants',         labelExpr: "NULLIF(TRIM(COALESCE(t.prenoms,'') || ' ' || COALESCE(t.nom,'')), '')",  scope: { kind: 'owner' } },
    { module: 'contrats',      moduleLabel: 'Contrats',        typeLabel: 'Bail',         table: 'leases',          labelExpr: "COALESCE(t.reference_bail, 'Bail #' || t.id)",                           scope: { kind: 'owner' } },
    { module: 'documents',     moduleLabel: 'Documents',       typeLabel: 'Document',     table: 'documents',       labelExpr: "COALESCE(NULLIF(t.description,''), t.url, 'Document #' || t.id)",        scope: { kind: 'owner' } },
    { module: 'edl',           moduleLabel: 'États des lieux', typeLabel: 'État des lieux', table: 'edl_inspections', labelExpr: "'EDL #' || t.id",                                                      scope: { kind: 'owner' } },
    { module: 'interventions', moduleLabel: 'Interventions',   typeLabel: 'Intervention', table: 'tickets',         labelExpr: "COALESCE(t.titre, 'Ticket #' || t.id)",                                  scope: { kind: 'owner' } },
    { module: 'taches',        moduleLabel: 'Tâches',          typeLabel: 'Tâche',        table: 'tasks',           labelExpr: "COALESCE(t.title, 'Tâche #' || t.id)",                                   scope: { kind: 'user', cols: ['created_by', 'assigned_to'] } },
    { module: 'messages',      moduleLabel: 'Messages',        typeLabel: 'Message',      table: 'messages',        labelExpr: "'Message #' || t.id",                                                    scope: { kind: 'user', cols: ['sender_id', 'recipient_id'] } },
];

export function getTrashModule(module: string): TrashModule | undefined {
    return TRASH_MODULES.find(m => m.module === module);
}

// Contexte d'accès : admin => ownerIds null (voit tout) ; sinon liste des owners gérés + userId.
export interface TrashContext {
    isAdmin: boolean;
    ownerIds: number[];   // ignoré si isAdmin
    userId: number;
}

export interface TrashFilters {
    module?: string | undefined;
    search?: string | undefined;
    deletedBy?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}

// Clause d'isolation d'un module selon le contexte. Params partagés (mêmes positions
// dans toutes les sous-requêtes de l'UNION) : $1=ownerIds, $2=userId.
function scopeClause(m: TrashModule, ctx: TrashContext): string {
    if (ctx.isAdmin) return 'TRUE';
    if (m.scope.kind === 'owner') return `t.owner_id = ANY($1::int[])`;
    return '(' + m.scope.cols.map(c => `t.${c} = $2`).join(' OR ') + ')';
}

export class TrashService {
    /** Liste paginée des éléments en corbeille (filtres module/recherche/utilisateur/dates). */
    static async list(dbClient: PoolClient, ctx: TrashContext, filters: TrashFilters) {
        // Params globaux à toute l'UNION.
        const params: any[] = [
            ctx.ownerIds,                                   // $1
            ctx.userId,                                     // $2
            filters.search ? `%${filters.search}%` : null,  // $3
            filters.deletedBy ?? null,                      // $4
            filters.startDate || null,                      // $5
            filters.endDate || null,                        // $6
        ];

        const mods = filters.module ? TRASH_MODULES.filter(m => m.module === filters.module) : TRASH_MODULES;
        if (mods.length === 0) return [];

        const blocks = mods.map(m => `
            SELECT '${m.module}'::text AS module,
                   '${m.moduleLabel}'::text AS module_label,
                   '${m.typeLabel}'::text AS type_label,
                   t.id,
                   (${m.labelExpr}) AS label,
                   t.deleted_at,
                   t.deleted_by,
                   COALESCE(u.nom, 'Utilisateur #' || t.deleted_by) AS deleted_by_name
            FROM ${m.table} t
            LEFT JOIN users u ON t.deleted_by = u.id
            WHERE t.deleted_at IS NOT NULL
              AND ${scopeClause(m, ctx)}
              AND ($3::text IS NULL OR (${m.labelExpr}) ILIKE $3)
              AND ($4::int IS NULL OR t.deleted_by = $4)
              AND ($5::timestamp IS NULL OR t.deleted_at >= $5)
              AND ($6::timestamp IS NULL OR t.deleted_at <= $6)
        `);

        const sql = blocks.join(' UNION ALL ') + ' ORDER BY deleted_at DESC';
        const result = await dbClient.query(sql, params);
        return result.rows;
    }

    /** Restaure un élément (deleted_at -> NULL) en respectant l'isolation. Retourne true si fait. */
    static async restore(dbClient: PoolClient, m: TrashModule, id: number, ctx: TrashContext): Promise<boolean> {
        const params: any[] = [ctx.ownerIds, ctx.userId, id];
        const r = await dbClient.query(
            `UPDATE ${m.table} SET deleted_at = NULL, deleted_by = NULL
             WHERE id = $3 AND deleted_at IS NOT NULL AND ${scopeClause(m, ctx)}`,
            params
        );
        return (r.rowCount ?? 0) > 0;
    }

    /** Supprime DÉFINITIVEMENT un élément déjà en corbeille (vrai DELETE). Retourne true si fait. */
    static async purge(dbClient: PoolClient, m: TrashModule, id: number, ctx: TrashContext): Promise<boolean> {
        const params: any[] = [ctx.ownerIds, ctx.userId, id];
        const r = await dbClient.query(
            `DELETE FROM ${m.table}
             WHERE id = $3 AND deleted_at IS NOT NULL AND ${scopeClause(m, ctx)}`,
            params
        );
        return (r.rowCount ?? 0) > 0;
    }
}
