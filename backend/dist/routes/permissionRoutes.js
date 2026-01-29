"use strict";
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
const express_1 = require("express");
const dotenv = __importStar(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv.config();
const router = (0, express_1.Router)();
const database_1 = __importDefault(require("../db/database"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// Middleware d'auth simplifié (à factoriser idéalement)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'Accès refusé.' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ message: 'Token invalide.' });
        req.user = user;
        next();
    });
};
// GET /api/permissions/matrix
// Récupère toute la matrice des permissions
router.get('/matrix', verifyToken, async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM permission_matrix ORDER BY role, module');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erreur fetch permissions:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PUT /api/permissions/matrix
// Met à jour une ligne de permission
router.put('/matrix', verifyToken, async (req, res) => {
    // Seul l'admin peut modifier les permissions
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Seul l\'administrateur peut modifier les permissions.' });
    }
    const { role, module, can_read, can_write, can_delete, can_validate } = req.body;
    try {
        await database_1.default.query(`INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (role, module) 
             DO UPDATE SET 
             can_read = EXCLUDED.can_read,
             can_write = EXCLUDED.can_write,
             can_delete = EXCLUDED.can_delete,
             can_validate = EXCLUDED.can_validate`, [role, module, can_read, can_write, can_delete, can_validate]);
        res.json({ message: 'Permissions mises à jour.' });
    }
    catch (error) {
        console.error('Erreur update permissions:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
//# sourceMappingURL=permissionRoutes.js.map