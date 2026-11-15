// backend/utils/templateAgency.ts
//
// Modèles de documents par agence (audit 2026-11-14, constat S3).
//
// Il n'existe pas de table « agence » : un gestionnaire crée ses collaborateurs
// (users.created_by = gestionnaire) et ses accès invités (jeton guest avec issuerId).
// On rattache donc chaque modèle au compte « racine » de l'agence :
//   - accès invité            → le compte émetteur (issuerId) ;
//   - collaborateur (created_by renseigné, créateur non admin) → son créateur ;
//   - sinon                   → le compte lui-même.
// Un créateur admin est ignoré : un compte créé par l'administrateur Hope est une
// agence à part entière, sans quoi toutes ces agences partageraient leurs modèles.
//
// Modèles Hope : agency_user_id IS NULL (modèles par défaut + anciens modèles créés
// avant cette correction). Visibles par tous, modifiables par l'admin seulement.

import { AuthenticatedRequest } from '../middleware/authMiddleware';
import pool from '../db/database';

// `db` : client à utiliser (req.dbClient dans les routes soumises à tenantGuard).
export async function resolveAgencyUserId(
    req: AuthenticatedRequest, db: { query: (...a: any[]) => Promise<any> } = pool
): Promise<number> {
    const baseUserId: number =
        req.user?.isGuest && req.user?.issuerId ? Number(req.user.issuerId) : Number(req.userId);

    const r = await db.query(
        `SELECT u.created_by, c.role AS creator_role, COALESCE(c.is_super_admin, FALSE) AS creator_super
           FROM users u
           LEFT JOIN users c ON c.id = u.created_by
          WHERE u.id = $1`,
        [baseUserId]
    );
    const row = r.rows[0];
    if (row?.created_by && row.creator_role !== 'admin' && !row.creator_super) {
        return Number(row.created_by);
    }
    return baseUserId;
}

export const isTemplateAdmin = (req: AuthenticatedRequest): boolean => req.userRole === 'admin';

/**
 * Clause de VISIBILITÉ (lecture) : modèles Hope + modèles de l'agence.
 * Admin : tout. Pousse le paramètre dans `params` si nécessaire.
 */
export function templateVisibilityClause(
    req: AuthenticatedRequest, agencyUserId: number, params: any[], alias = 'document_templates'
): string {
    if (isTemplateAdmin(req)) return '';
    params.push(agencyUserId);
    return ` AND (${alias}.agency_user_id IS NULL OR ${alias}.agency_user_id = $${params.length})`;
}

/**
 * Clause d'ÉCRITURE : modèles de l'agence uniquement (les modèles Hope sont en
 * lecture seule pour les agences). Admin : tout.
 */
export function templateWriteClause(
    req: AuthenticatedRequest, agencyUserId: number, params: any[], alias = 'document_templates'
): string {
    if (isTemplateAdmin(req)) return '';
    params.push(agencyUserId);
    return ` AND ${alias}.agency_user_id = $${params.length}`;
}
