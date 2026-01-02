import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
/**
 * Middleware pour vérifier l'accès d'un utilisateur à un propriétaire
 * Utilisé sur les routes qui nécessitent owner_id
 */
export declare const checkOwnerAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware pour filtrer automatiquement les requêtes par owner_id
 * Ajoute une clause WHERE owner_id IN (...) aux requêtes
 */
export declare const filterByOwner: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware pour vérifier les permissions spécifiques
 */
export declare const checkPermission: (permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Helper function pour construire une clause WHERE avec owner_id
 */
export declare const buildOwnerWhereClause: (ownerIds: number[] | null) => string;
declare const _default: {
    checkOwnerAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    filterByOwner: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    checkPermission: (permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    buildOwnerWhereClause: (ownerIds: number[] | null) => string;
};
export default _default;
//# sourceMappingURL=ownerIsolation.d.ts.map