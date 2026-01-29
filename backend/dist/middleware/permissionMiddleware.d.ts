import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
type PermissionAction = 'read' | 'write' | 'delete' | 'validate';
/**
 * Creates a middleware that checks if the user has the required permission
 * @param module - The module name (e.g., 'biens', 'locataires', 'finance')
 * @param action - The action type ('read', 'write', 'delete', 'validate')
 */
export declare const checkPermission: (module: string, action: PermissionAction) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware factory for common permission patterns
 */
export declare const permissions: {
    canRead: (module: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    canWrite: (module: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    canDelete: (module: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    canValidate: (module: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
};
export default permissions;
//# sourceMappingURL=permissionMiddleware.d.ts.map