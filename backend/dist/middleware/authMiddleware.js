"use strict";
// backend/middleware/authMiddleware.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// 2. Fonction principale du middleware
const protect = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Vérifier que decoded est bien un objet avec les propriétés attendues
        if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'role' in decoded) {
            const payload = decoded;
            // 3. Ajouter l'ID et le Rôle de l'utilisateur à l'objet requête (req)
            // Les routes futures pourront accéder à ces infos via req.userId et req.userRole.
            // 3. Ajouter l'ID et le Rôle de l'utilisateur à l'objet requête (req)
            req.userId = payload.id;
            req.userRole = payload.role;
            // Fix for auditRoutes accessing req.user
            req.user = {
                id: payload.id,
                role: payload.role,
                userType: payload.userType || 'gestionnaire' // Fallback or fetch from DB if needed
            };
        }
        else {
            return res.status(403).json({ message: 'Accès refusé : Jeton invalide.' });
        }
        // 4. Continuer vers la prochaine fonction (la route demandée)
        next();
    }
    catch (error) {
        // Si la vérification échoue (jeton expiré, falsifié, etc.)
        return res.status(403).json({ message: 'Accès refusé : Jeton non valide ou expiré.' });
    }
};
exports.protect = protect;
//# sourceMappingURL=authMiddleware.js.map