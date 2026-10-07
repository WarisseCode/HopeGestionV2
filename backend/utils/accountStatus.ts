// backend/utils/accountStatus.ts
//
// [SÉCURITÉ] Statuts de compte utilisateur qui interdisent toute connexion. Source unique
// partagée par :
//  - AuthService.login                 (login email / mot de passe)
//  - POST /api/auth/mobile/google      (googleAuthRoutes.ts — connexion Google mobile)
// La casse stockée n'est pas homogène : PATCH /api/compte/utilisateurs/:id/suspend écrit
// 'Suspendu' (majuscule), d'autres chemins écrivent 'inactif' / 'suspendu'. Une comparaison
// stricte laissait donc un compte suspendu se connecter (bug lié à la faille C3 de l'audit).

const BLOCKED_STATUSES = ['inactif', 'suspendu'];

/**
 * Vrai si le statut interdit la connexion ('inactif' / 'suspendu', casse et espaces
 * ignorés). Un statut absent ou non textuel n'est pas considéré comme bloquant
 * (même comportement que les comparaisons qu'elle remplace).
 */
export const isAccountBlocked = (statut: string | null | undefined): boolean =>
    typeof statut === 'string' && BLOCKED_STATUSES.includes(statut.trim().toLowerCase());
