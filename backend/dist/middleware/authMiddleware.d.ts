import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    userId?: number;
    userRole?: string;
    user?: any;
}
export declare const protect: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authMiddleware.d.ts.map