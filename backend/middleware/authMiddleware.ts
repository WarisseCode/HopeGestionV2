// backend/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Définir l'interface pour étendre la requête Express
// Cela permet d'ajouter 'userId' et 'userRole' à l'objet 'req' après décodage.
export interface AuthenticatedRequest extends Request {
    userId?: number;
    userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// 2. Fonction principale du middleware
export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Récupérer le jeton de l'en-tête "Authorization"
    const authHeader = req.headers.authorization;

    // Vérification de la présence et du format "Bearer [TOKEN]"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accès refusé : Jeton manquant ou invalide.' });
    }

    // Extrait le jeton (enlève "Bearer ")
    const token = authHeader.split(' ')[1];
    
    // Vérification supplémentaire que le token existe
    if (!token) {
        return res.status(401).json({ message: 'Accès refusé : Jeton manquant.' });
    }

    try {
        // 2. Vérifier et décoder le jeton
        // Si le jeton est valide (signature, expiration), la vérification réussit.
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Vérifier que decoded est bien un objet avec les propriétés attendues
        if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'role' in decoded) {
            const payload = decoded as { id: number, role: string };
            
            // 3. Ajouter l'ID et le Rôle de l'utilisateur à l'objet requête (req)
            // Les routes futures pourront accéder à ces infos via req.userId et req.userRole.
            req.userId = payload.id;
            req.userRole = payload.role;
        } else {
            return res.status(403).json({ message: 'Accès refusé : Jeton invalide.' });
        }
        
        // 4. Continuer vers la prochaine fonction (la route demandée)
        next();
        
    } catch (error) {
        // Si la vérification échoue (jeton expiré, falsifié, etc.)
        return res.status(403).json({ message: 'Accès refusé : Jeton non valide ou expiré.' });
    }
};