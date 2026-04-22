"use strict";
// backend/middleware/authMiddleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const database_1 = __importDefault(require("../db/database"));
// 2. Fonction principale du middleware
const protect = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        // Vérifier que decoded est bien un objet avec les propriétés attendues
        if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'role' in decoded) {
            const payload = decoded;
            console.log(`[AUTH] User authenticated. ID: ${payload.id}, Role: ${payload.role}, IsGuest: ${payload.isGuest || false}`);
            // Récupérer l'email depuis la DB si pas dans le token
            let userEmail = payload.email || null;
            if (!userEmail) {
                try {
                    const userRow = await database_1.default.query('SELECT email FROM users WHERE id = $1', [payload.id]);
                    if (userRow.rows.length > 0)
                        userEmail = userRow.rows[0].email;
                }
                catch (dbErr) {
                    console.warn('[AUTH] Could not fetch user email from DB:', dbErr);
                }
            }
            // 3. Ajouter l'ID et le Rôle de l'utilisateur à l'objet requête (req)
            // Les routes futures pourront accéder à ces infos via req.userId et req.userRole.
            req.userId = payload.id;
            req.userRole = payload.role;
            // Extended user object with guest context
            req.user = {
                id: payload.id,
                role: payload.role,
                email: userEmail,
                userType: payload.userType || 'gestionnaire',
                // Guest-specific fields
                isGuest: payload.isGuest || false,
                issuerId: payload.issuerId || null, // The account context for data access
                permissions: payload.permissions || null,
                // Helper: Get the effective owner ID for data queries
                getEffectiveOwnerId: function () {
                    return this.isGuest && this.issuerId ? this.issuerId : this.id;
                }
            };
        }
        else {
            console.error('[AUTH] Invalid token structure:', decoded);
            return res.status(403).json({ message: 'Accès refusé : Jeton invalide.' });
        }
        // 4. Continuer vers la prochaine fonction (la route demandée)
        next();
    }
    catch (error) {
        console.error('[AUTH] Token verification failed:', error);
        // Token expiré → 401 pour déclencher l'auto-refresh côté frontend
        // Token falsifié ou invalide → 403
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Accès refusé : Jeton expiré.' });
        }
        return res.status(403).json({ message: 'Accès refusé : Jeton non valide.' });
    }
};
exports.protect = protect;
