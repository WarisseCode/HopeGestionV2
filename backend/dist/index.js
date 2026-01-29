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
const path_1 = __importDefault(require("path"));
//import cors from 'cors';
const dotenv = __importStar(require("dotenv"));
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
const database_1 = __importDefault(require("./db/database"));
exports.pool = database_1.default;
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Auto-seed Super Admin if none exists
const seedAdmin_1 = require("./scripts/seedAdmin");
exports.pool.connect()
    .then(async (client) => {
    console.log('Successfully connected to PostgreSQL!');
    client.release();
    // Seed Super Admin on first startup
    await (0, seedAdmin_1.seedSuperAdmin)();
})
    .catch(err => {
    console.error('Warning: Error connecting to PostgreSQL:', err.stack);
    console.log('Continuing to start server without database connection...');
});
const cors_1 = __importDefault(require("cors"));
// --- 1. Middleware essentiels ---
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cors_1.default)({
    origin: true, // Allow all origins temporarily for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Servir les fichiers uploadés
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// --- 2. Routes de l'API ---
// Routes d'authentification (Publiques)
// Routes d'authentification (Publiques)
app.use('/api/auth', authRoutes_1.default);
// Routes Réservations (Public + Protected mix inside)
const reservationRoutes_1 = __importDefault(require("./routes/reservationRoutes"));
app.use('/api/reservations', reservationRoutes_1.default);
// Routes Publiques (Aucune authentification requise)
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
app.use('/api/public', publicRoutes_1.default);
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
// Routes Tenant Access (Portal Control)
const tenantAccessRoutes_1 = __importDefault(require("./routes/tenantAccessRoutes"));
app.use('/api/tenant-access', authMiddleware_1.protect, tenantAccessRoutes_1.default);
// Routes Alertes
app.use('/api/alertes', authMiddleware_1.protect, alertRoutes_1.default);
// Routes Permissions (Matrice)
const permissionRoutes_1 = __importDefault(require("./routes/permissionRoutes"));
app.use('/api/permissions', authMiddleware_1.protect, permissionRoutes_1.default);
// Routes User-Owner Assignments (Affectation)
const userAssignmentRoutes_1 = __importDefault(require("./routes/userAssignmentRoutes"));
app.use('/api/user-assignments', authMiddleware_1.protect, userAssignmentRoutes_1.default);
// Routes Locations/Baux
const leaseRoutes_1 = __importDefault(require("./routes/leaseRoutes"));
app.use('/api/locations', authMiddleware_1.protect, leaseRoutes_1.default);
// Routes Finances
// Routes Finances
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
const taxRoutes_1 = __importDefault(require("./routes/taxRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const notebookRoutes_1 = __importDefault(require("./routes/notebookRoutes"));
app.use('/api/finances', authMiddleware_1.protect, financeRoutes_1.default);
app.use('/api/expenses', authMiddleware_1.protect, expenseRoutes_1.default);
app.use('/api/loans', authMiddleware_1.protect, loanRoutes_1.default);
app.use('/api/tax', authMiddleware_1.protect, taxRoutes_1.default);
app.use('/api/templates', authMiddleware_1.protect, templateRoutes_1.default);
app.use('/api/carnet', authMiddleware_1.protect, notebookRoutes_1.default);
// Routes Inventaires (États des lieux)
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
app.use('/api/inventories', authMiddleware_1.protect, inventoryRoutes_1.default);
// Routes États des Lieux (Inspections juridiques)
const edlRoutes_1 = __importDefault(require("./routes/edlRoutes"));
app.use('/api/edl', authMiddleware_1.protect, edlRoutes_1.default);
// Module XIII - Interventions
const providerRoutes_1 = __importDefault(require("./routes/providerRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const serviceContractRoutes_1 = __importDefault(require("./routes/serviceContractRoutes"));
app.use('/api/providers', authMiddleware_1.protect, providerRoutes_1.default);
app.use('/api/tickets', authMiddleware_1.protect, ticketRoutes_1.default);
app.use('/api/service-contracts', authMiddleware_1.protect, serviceContractRoutes_1.default);
// Module XIV - Tâches & Messages
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
app.use('/api/tasks', authMiddleware_1.protect, taskRoutes_1.default);
app.use('/api/messages', authMiddleware_1.protect, messageRoutes_1.default);
// Routes Abonnements (Subscriptions)
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
app.use('/api/subscriptions', subscriptionRoutes_1.default); // Mix of public (plans) and protected routes
// Routes Webhooks FedaPay (paiements)
const fedapayWebhookRoutes_1 = __importDefault(require("./routes/fedapayWebhookRoutes"));
app.use('/api/webhooks/fedapay', fedapayWebhookRoutes_1.default);
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
const adminRoutes_1 = __importStar(require("./routes/adminRoutes"));
app.use('/api/admin', authMiddleware_1.protect, adminRoutes_1.default);
// Public routes for admin invitation (no auth required)
app.get('/api/admin-invite/check', adminRoutes_1.checkAdminInvite);
app.post('/api/admin-invite/accept', adminRoutes_1.acceptAdminInvite);
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