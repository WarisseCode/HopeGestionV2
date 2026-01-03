"use strict";
// backend/index.ts
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
exports.pool = void 0;
// Importations de base
const express_1 = __importDefault(require("express"));
//import cors from 'cors';
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const locataireRoutes_1 = __importDefault(require("./routes/locataireRoutes")); // <--- AJOUT
const bienRoutes_1 = __importDefault(require("./routes/bienRoutes")); // <--- AJOUT
const bauxRoutes_1 = __importDefault(require("./routes/bauxRoutes"));
const paiementRoutes_1 = __importDefault(require("./routes/paiementRoutes"));
const depenseRoutes_1 = __importDefault(require("./routes/depenseRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const compteRoutes_1 = __importDefault(require("./routes/compteRoutes"));
const ownerRoutes_1 = __importDefault(require("./routes/ownerRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const delegationRoutes_1 = __importDefault(require("./routes/delegationRoutes"));
const calendarRoutes_1 = __importDefault(require("./routes/calendarRoutes"));
const auditRoutes_1 = __importDefault(require("./routes/auditRoutes"));
const mobileMoneyRoutes_1 = __importDefault(require("./routes/mobileMoneyRoutes"));
const alertRoutes_1 = __importDefault(require("./routes/alertRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
// -------------------------********************-------------------------///
// Charger les variables d'environnement
dotenv.config();
// Configuration de la Base de Données
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
exports.pool.connect()
    .then(client => {
    console.log('Successfully connected to PostgreSQL!');
    client.release();
})
    .catch(err => {
    console.error('Warning: Error connecting to PostgreSQL:', err.stack);
    console.log('Continuing to start server without database connection...');
});
const cors_1 = __importDefault(require("cors"));
// --- 1. Middleware essentiels ---
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: true, // Allow all origins temporarily for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// --- 2. Routes de l'API ---
// Routes d'authentification (Publiques)
app.use('/api/auth', authRoutes_1.default);
// --- Routes Protégées ---
// Routes Locataires (Nécessite le jeton JWT)
app.use('/api/locataires', authMiddleware_1.protect, locataireRoutes_1.default); // <--- NOUVELLE LIGNE
// Routes Biens Immobiliers (Nécessite le jeton JWT)
app.use('/api/biens', authMiddleware_1.protect, bienRoutes_1.default); // <--- NOUVELLE LIGNE
app.use('/api/baux', authMiddleware_1.protect, bauxRoutes_1.default);
app.use('/api/paiements', authMiddleware_1.protect, paiementRoutes_1.default);
app.use('/api/depenses', authMiddleware_1.protect, depenseRoutes_1.default);
app.use('/api/dashboard', authMiddleware_1.protect, dashboardRoutes_1.default);
app.use('/api/compte', authMiddleware_1.protect, compteRoutes_1.default);
app.use('/api/owners', authMiddleware_1.protect, ownerRoutes_1.default);
app.use('/api/documents', authMiddleware_1.protect, documentRoutes_1.default);
app.use('/api/delegations', authMiddleware_1.protect, delegationRoutes_1.default);
app.use('/api/calendar', authMiddleware_1.protect, calendarRoutes_1.default);
app.use('/api/audit-logs', authMiddleware_1.protect, auditRoutes_1.default);
// Routes Mobile Money
app.use('/api/mobile-money', authMiddleware_1.protect, mobileMoneyRoutes_1.default);
// Routes Notifications
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
app.use('/api/notifications', authMiddleware_1.protect, notificationRoutes_1.default);
// Routes Alertes
app.use('/api/alertes', authMiddleware_1.protect, alertRoutes_1.default);
// Route Test Protégée (pour validation rapide de 'protect')
// Route Test Protégée (pour validation rapide de 'protect')
app.get('/api/profil', authMiddleware_1.protect, async (req, res) => {
    try {
        const userResult = await exports.pool.query('SELECT nom, email, user_type, role FROM users WHERE id = $1', [req.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        const user = userResult.rows[0];
        res.status(200).json({
            message: `Bienvenue, votre ID est ${req.userId} et votre type est ${user.user_type}`,
            user: {
                id: req.userId,
                nom: user.nom,
                email: user.email,
                userType: user.user_type,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du profil.' });
    }
});
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
app.use('/api/admin', adminRoutes_1.default);
// --- 3. Test de communication (Endpoint de Ping) ---
app.get('/api/ping', (req, res) => {
    res.status(200).json({
        message: 'Pong! API HopeGestionV2 opérationnelle.',
        timestamp: new Date().toISOString(),
    });
});
// --- 4. Démarrage du serveur ---
const CronService_1 = require("./services/CronService");
CronService_1.CronService.init();
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        message: 'Erreur serveur critique',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
//# sourceMappingURL=index.js.map