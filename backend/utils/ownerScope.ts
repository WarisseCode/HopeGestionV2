// backend/utils/ownerScope.ts
//
// Filtre d'isolation par propriétaire, partagé par toutes les routes.
//
// Pourquoi un module unique : ces fonctions étaient recopiées dans 15 fichiers de routes
// (scopeByOwner ×12, getEffectiveOwnerIds ×3). Chaque nouvelle route devait penser à
// recopier le filtre, et un oubli ouvrait l'accès aux données d'une autre agence (audit
// S2, docs/suivi/AUDIT_2026-11-14.md). Une seule version, testée, évite ces écarts.
//
// Contexte posé par le middleware tenantGuard sur la requête :
//   - userRole        : 'admin' contourne le filtre (vue globale de la plateforme) ;
//   - validOwnerIds   : propriétaires accessibles au compte (liste vide = aucun accès) ;
//   - resolvedOwnerId : propriétaire choisi explicitement (sélecteur), s'il y en a un.
//
// Pourquoi filtrer en SQL alors que la base a des politiques RLS : plusieurs tables
// (leases, expenses…) n'ont pas de politique versionnée, et le rôle de connexion peut avoir
// BYPASSRLS. La RLS seule ne protège donc pas : ce filtre explicite est la vraie barrière.

// `import type` : aucun chargement du middleware à l'exécution (module sans dépendance).
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/** Champs posés par tenantGuard (absents du type AuthenticatedRequest). */
type OwnerContext = {
    userRole?: string;
    validOwnerIds?: number[];
    resolvedOwnerId?: number | null;
};
const ctx = (req: AuthenticatedRequest): OwnerContext => req as unknown as OwnerContext;

// Le nom de colonne est inséré tel quel dans le SQL (un nom de colonne ne peut pas être
// passé en paramètre $n). On n'accepte donc qu'un identifiant simple, éventuellement
// préfixé d'un alias (« owner_id », « l.owner_id ») : une valeur venue de l'utilisateur
// ne pourra jamais devenir une injection SQL, même si une future route se trompe.
const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/;

function assertIdentifier(name: string): void {
    if (!SQL_IDENTIFIER.test(name)) {
        throw new Error(`ownerScope : identifiant SQL invalide « ${name} »`);
    }
}

/** Propriétaires accessibles au compte ; tableau vide si le middleware n'a rien posé. */
export function getValidOwnerIds(req: AuthenticatedRequest): number[] {
    return ctx(req).validOwnerIds || [];
}

/**
 * Propriétaires à prendre en compte : celui choisi dans le sélecteur s'il y en a un,
 * sinon tous ceux du compte. À utiliser avec « owner_id = ANY($n) » : filtrer sur
 * resolvedOwnerId seul donnait « owner_id = NULL » pour un gestionnaire multi-propriétaires
 * (resolvedOwnerId vaut alors null), et des pages vides (Finances, prêts).
 */
export function getEffectiveOwnerIds(req: AuthenticatedRequest): number[] {
    const ownerId = ctx(req).resolvedOwnerId;
    return ownerId != null ? [ownerId] : getValidOwnerIds(req);
}

/**
 * Renvoie la condition « AND <col> = ANY($n) » à ajouter à une requête, et ajoute la liste
 * des propriétaires à `params` (le numéro $n est donc toujours le bon).
 * Renvoie '' pour un admin. Liste vide => aucune ligne (ANY sur un tableau vide est faux).
 */
export function scopeByOwner(req: AuthenticatedRequest, params: unknown[], col = 'owner_id'): string {
    assertIdentifier(col);
    if (ctx(req).userRole === 'admin') return '';
    params.push(getValidOwnerIds(req));
    return ` AND ${col} = ANY($${params.length}::int[])`;
}

/**
 * Variante pour les dépenses : une dépense sans owner_id (anciennes saisies) appartient
 * au propriétaire de son immeuble.
 */
export function scopeExpenseByOwner(req: AuthenticatedRequest, params: unknown[], alias = 'e'): string {
    assertIdentifier(alias);
    if (ctx(req).userRole === 'admin') return '';
    params.push(getValidOwnerIds(req));
    const n = params.length;
    return ` AND (${alias}.owner_id = ANY($${n}::int[]) OR (${alias}.owner_id IS NULL AND EXISTS (
        SELECT 1 FROM buildings bx WHERE bx.id = ${alias}.building_id AND bx.owner_id = ANY($${n}::int[]))))`;
}
