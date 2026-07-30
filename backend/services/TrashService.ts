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

// ─────────────────────────────────────────────────────────────────────────────
// Dépendances de purge (CdC §XVII — suppression définitive en cascade)
//
// Une suppression définitive détruit aussi les données rattachées. On les déclare
// ici plutôt que de se reposer sur les ON DELETE du schéma, pour deux raisons :
//   1. `leases.lot_id` / `leases.tenant_id` sont en ON DELETE RESTRICT : sans
//      suppression explicite préalable, Postgres refuse la purge (23503).
//   2. Le schéma de prod a dérivé du repo : compter et supprimer explicitement
//      donne un résultat identique que la FK soit en CASCADE ou non.
//
// L'ordre du tableau est l'ordre de suppression : le plus profond d'abord.
// ─────────────────────────────────────────────────────────────────────────────
interface Dependent {
    table: string;
    label: string;   // libellé affiché dans la confirmation
    where: string;   // clause reliant la table à l'id racine ($1)
}

const LOTS_OF_BUILDING = 'SELECT id FROM lots WHERE building_id = $1';
const LEASES_OF_BUILDING = `SELECT id FROM leases WHERE lot_id IN (${LOTS_OF_BUILDING})`;
const LEASES_OF_LOT = 'SELECT id FROM leases WHERE lot_id = $1';
const LEASES_OF_TENANT = 'SELECT id FROM leases WHERE tenant_id = $1';

const DEPENDENTS: Record<string, Dependent[]> = {
    biens: [
        { table: 'payments',                  label: 'Paiements',              where: `lease_id IN (${LEASES_OF_BUILDING})` },
        { table: 'rent_payment_transactions', label: 'Transactions de loyer',  where: `lease_id IN (${LEASES_OF_BUILDING})` },
        { table: 'payment_schedules',         label: 'Échéances de loyer',     where: `lease_id IN (${LEASES_OF_BUILDING})` },
        { table: 'leases',                    label: 'Baux',                   where: `lot_id IN (${LOTS_OF_BUILDING})` },
        { table: 'edl_inspections',           label: 'États des lieux',        where: `lot_id IN (${LOTS_OF_BUILDING})` },
        { table: 'tickets',                   label: 'Interventions',          where: `lot_id IN (${LOTS_OF_BUILDING})` },
        { table: 'lots',                      label: 'Lots',                   where: 'building_id = $1' },
    ],
    lots: [
        { table: 'payments',                  label: 'Paiements',              where: `lease_id IN (${LEASES_OF_LOT})` },
        { table: 'rent_payment_transactions', label: 'Transactions de loyer',  where: `lease_id IN (${LEASES_OF_LOT})` },
        { table: 'payment_schedules',         label: 'Échéances de loyer',     where: `lease_id IN (${LEASES_OF_LOT})` },
        { table: 'leases',                    label: 'Baux',                   where: 'lot_id = $1' },
        { table: 'edl_inspections',           label: 'États des lieux',        where: 'lot_id = $1' },
        { table: 'tickets',                   label: 'Interventions',          where: 'lot_id = $1' },
    ],
    locataires: [
        { table: 'payments',                  label: 'Paiements',              where: `lease_id IN (${LEASES_OF_TENANT})` },
        // Rattachées au locataire directement OU via ses baux (deux FK distinctes).
        { table: 'rent_payment_transactions', label: 'Transactions de loyer',  where: `tenant_id = $1 OR lease_id IN (${LEASES_OF_TENANT})` },
        { table: 'payment_schedules',         label: 'Échéances de loyer',     where: `lease_id IN (${LEASES_OF_TENANT})` },
        { table: 'leases',                    label: 'Baux',                   where: 'tenant_id = $1' },
    ],
    contrats: [
        { table: 'payments',                  label: 'Paiements',              where: 'lease_id = $1' },
        { table: 'rent_payment_transactions', label: 'Transactions de loyer',  where: 'lease_id = $1' },
        { table: 'payment_schedules',         label: 'Échéances de loyer',     where: 'lease_id = $1' },
    ],
    // documents / edl / interventions / taches / messages : aucune dépendance métier
    // (les tables de détail comme edl_items suivent en ON DELETE CASCADE).
};

export interface TrashImpact {
    table: string;
    label: string;
    count: number;
}

export type PurgeResult =
    | { status: 'purged'; impact: TrashImpact[] }
    | { status: 'blocked'; impact: TrashImpact[] }   // dépendances trouvées, confirmation requise
    | { status: 'not_found' };

// Clause d'isolation d'un module selon le contexte. Params partagés (mêmes positions
// dans toutes les sous-requêtes de l'UNION) : $1=ownerIds, $2=userId.
// ⚠️ Les colonnes sont préfixées `t.` : toute requête qui utilise cette clause DOIT
// aliaser sa table en `t` (y compris les UPDATE/DELETE, cf. restore/purge).
function scopeClause(m: TrashModule, ctx: TrashContext): string {
    if (ctx.isAdmin) return 'TRUE';
    if (m.scope.kind === 'owner') return `t.owner_id = ANY($1::int[])`;
    return '(' + m.scope.cols.map(c => `t.${c} = $2`).join(' OR ') + ')';
}

// Ancres toujours vraies : garantissent que $1/$2 apparaissent (avec cast) dans chaque
// requête, même quand l'isolation ne les utilise pas (admin / owner-only), sinon
// Postgres ne peut pas déduire leur type (42P18).
const TYPE_ANCHORS = `($1::int[] IS NULL OR TRUE) AND ($2::int IS NULL OR TRUE)`;

export class TrashService {
    // Cache d'existence des tables. Le schéma de prod ayant dérivé du repo, une table
    // déclarée dans DEPENDENTS peut être absente : on l'ignore au lieu de planter (42P01).
    private static tableExistsCache = new Map<string, boolean>();

    private static async tableExists(dbClient: PoolClient, table: string): Promise<boolean> {
        const cached = TrashService.tableExistsCache.get(table);
        if (cached !== undefined) return cached;
        const r = await dbClient.query('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${table}`]);
        const ok = r.rows[0]?.ok === true;
        TrashService.tableExistsCache.set(table, ok);
        return ok;
    }

    /** Dépendances déclarées du module, filtrées sur les tables réellement présentes. */
    private static async resolveDependents(dbClient: PoolClient, m: TrashModule): Promise<Dependent[]> {
        const declared = DEPENDENTS[m.module] || [];
        const present: Dependent[] = [];
        for (const d of declared) {
            if (await TrashService.tableExists(dbClient, d.table)) present.push(d);
        }
        return present;
    }

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
              AND ${TYPE_ANCHORS}
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

    /** Vrai si l'élément est bien en corbeille ET accessible dans ce contexte (anti-IDOR). */
    static async canAccess(dbClient: PoolClient, m: TrashModule, id: number, ctx: TrashContext): Promise<boolean> {
        const r = await dbClient.query(
            `SELECT 1 FROM ${m.table} t
             WHERE t.id = $3 AND t.deleted_at IS NOT NULL
               AND ${TYPE_ANCHORS}
               AND ${scopeClause(m, ctx)}`,
            [ctx.ownerIds, ctx.userId, id]
        );
        return (r.rowCount ?? 0) > 0;
    }

    /**
     * Ce qu'une suppression définitive détruirait, hors élément lui-même.
     * Compte TOUTES les lignes rattachées, y compris celles déjà en corbeille et
     * celles encore actives (un lot en corbeille peut avoir un bail toujours actif).
     * Ne retourne que les entrées non nulles.
     */
    static async getImpact(dbClient: PoolClient, m: TrashModule, id: number): Promise<TrashImpact[]> {
        const deps = await TrashService.resolveDependents(dbClient, m);
        if (deps.length === 0) return [];

        // Un seul aller-retour : une UNION ALL de COUNT indexés. L'ordre des lignes
        // n'étant pas garanti par UNION ALL, on remappe via idx.
        const sql = deps
            .map((d, i) => `SELECT ${i} AS idx, (SELECT COUNT(*) FROM ${d.table} WHERE ${d.where})::int AS n`)
            .join(' UNION ALL ');
        const r = await dbClient.query(sql, [id]);

        const counts = new Map<number, number>(r.rows.map((row: any) => [row.idx, row.n]));
        return deps
            .map((d, i) => ({ table: d.table, label: d.label, count: counts.get(i) ?? 0 }))
            .filter(x => x.count > 0);
    }

    /** Restaure un élément (deleted_at -> NULL) en respectant l'isolation. Retourne true si fait. */
    static async restore(dbClient: PoolClient, m: TrashModule, id: number, ctx: TrashContext): Promise<boolean> {
        const r = await dbClient.query(
            `UPDATE ${m.table} AS t SET deleted_at = NULL, deleted_by = NULL
             WHERE t.id = $3 AND t.deleted_at IS NOT NULL
               AND ${TYPE_ANCHORS}
               AND ${scopeClause(m, ctx)}`,
            [ctx.ownerIds, ctx.userId, id]
        );
        return (r.rowCount ?? 0) > 0;
    }

    /**
     * Supprime DÉFINITIVEMENT un élément déjà en corbeille, ainsi que ses dépendances.
     * Sans `force`, retourne 'blocked' + l'impact chiffré au lieu de détruire quoi que
     * ce soit : l'appelant doit confirmer explicitement (CdC §XVII — perte d'historique).
     * La purge est transactionnelle : tout passe, ou rien.
     */
    static async purge(
        dbClient: PoolClient,
        m: TrashModule,
        id: number,
        ctx: TrashContext,
        force = false
    ): Promise<PurgeResult> {
        if (!(await TrashService.canAccess(dbClient, m, id, ctx))) return { status: 'not_found' };

        const impact = await TrashService.getImpact(dbClient, m, id);
        if (impact.length > 0 && !force) return { status: 'blocked', impact };

        const deps = await TrashService.resolveDependents(dbClient, m);

        await dbClient.query('BEGIN');
        try {
            // Le plus profond d'abord : les sous-requêtes de `where` remontent la chaîne
            // depuis l'id racine, qui n'est supprimé qu'en dernier.
            for (const d of deps) {
                await dbClient.query(`DELETE FROM ${d.table} WHERE ${d.where}`, [id]);
            }

            const r = await dbClient.query(
                `DELETE FROM ${m.table} AS t
                 WHERE t.id = $3 AND t.deleted_at IS NOT NULL
                   AND ${TYPE_ANCHORS}
                   AND ${scopeClause(m, ctx)}`,
                [ctx.ownerIds, ctx.userId, id]
            );

            await dbClient.query('COMMIT');
            return (r.rowCount ?? 0) > 0 ? { status: 'purged', impact } : { status: 'not_found' };
        } catch (error) {
            await dbClient.query('ROLLBACK').catch(() => {/* connexion déjà perdue */});
            throw error;
        }
    }
}
