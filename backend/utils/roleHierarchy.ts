// backend/utils/roleHierarchy.ts
//
// [SÉCURITÉ] Hiérarchie des rôles attribuables à un compte utilisateur selon le rôle de
// l'appelant. Source unique partagée par :
//  - POST /api/auth/invite-user   (authRoutes.ts — faille C2 de l'audit)
//  - POST /api/compte/utilisateurs (compteRoutes.ts — faille C3 de l'audit)
// Toute modification ici s'applique aux deux routes : ne pas redéfinir ces listes ailleurs.

// Rôles autorisés à créer / inviter / gérer des comptes utilisateurs.
export const USER_MANAGER_ROLES = ['admin', 'gestionnaire', 'proprietaire'];

// Rôles opérationnels subalternes : seuls rôles qu'un non-admin peut attribuer.
export const SUBORDINATE_ROLES = ['comptable', 'agent_recouvreur', 'prestataire'];

// Liste blanche globale (= ce qu'un admin peut attribuer) : toute autre valeur est refusée.
export const ALL_ASSIGNABLE_ROLES = ['admin', 'gestionnaire', 'manager', ...SUBORDINATE_ROLES];

// Rôle maximum attribuable selon le rôle de l'appelant (jamais égal ou supérieur au sien,
// sauf admin) : seul un admin attribue admin / gestionnaire / manager.
export const ASSIGNABLE_ROLES_BY_CALLER: Record<string, string[]> = {
    admin: ALL_ASSIGNABLE_ROLES,
    gestionnaire: SUBORDINATE_ROLES,
    proprietaire: SUBORDINATE_ROLES,
};

/** Rôles que `callerRole` est autorisé à attribuer (liste vide si rôle inconnu). */
export const assignableRolesFor = (callerRole: string | undefined | null): string[] =>
    (callerRole && Object.prototype.hasOwnProperty.call(ASSIGNABLE_ROLES_BY_CALLER, callerRole))
        ? (ASSIGNABLE_ROLES_BY_CALLER[callerRole] ?? [])
        : [];
