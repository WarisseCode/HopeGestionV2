// backend/middleware/mobileAuthCorsGate.ts
// Garde CORS dédiée aux routes d'auth mobile (client natif) : jamais de logique CORS.
import { Request, Response, NextFunction, RequestHandler } from 'express';

// - Un client Flutter natif n'envoie jamais l'en-tête Origin ; seul un navigateur
//   le fait (sur tout POST et sur les preflights OPTIONS). Rejeter dès qu'Origin
//   est présent empêche donc tout script de page web d'atteindre ces routes,
//   y compris via un preflight qui échouera avant même la requête réelle.
// - Le routage Express est insensible à la casse par défaut (ni `case sensitive
//   routing` ni `strict routing` ne sont activés ailleurs dans ce backend) : un
//   `startsWith` sensible à la casse laisserait passer /API/AUTH/MOBILE/login
//   vers `corsMiddleware`. D'où le flag `i` et `(\/|$)` qui couvre aussi bien
//   /api/auth/mobile seul que /api/auth/mobile/....
export const MOBILE_AUTH_PATH_RE = /^\/api\/auth\/mobile(\/|$)/i;

export function createMobileAuthCorsGate(corsMiddleware: RequestHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        if (MOBILE_AUTH_PATH_RE.test(req.path)) {
            if (req.headers.origin !== undefined) {
                console.warn(`🚨 CORS: Blocked browser request (Origin present) on mobile auth route: ${req.method} ${req.path} origin=${req.headers.origin} ip=${req.ip}`);
                return res.status(403).json({ message: 'Origine non autorisée.' });
            }
            return next();
        }
        return corsMiddleware(req, res, next);
    };
}
