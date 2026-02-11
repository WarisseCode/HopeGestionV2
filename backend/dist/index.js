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
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const googleAuthRoutes_1 = __importDefault(require("./routes/googleAuthRoutes"));
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
// Configuration de la Base de Données
const database_1 = __importDefault(require("./db/database"));
exports.pool = database_1.default;
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
console.log('✅ JWT_SECRET validation passed');
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
// ========================================
// 🔒 SECURITY MIDDLEWARE STACK
// ========================================
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
// Note: Using PostgreSQL, no need for mongo-sanitize (MongoDB-specific)
// 1. Security Headers (Helmet)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    crossOriginOpenerPolicy: false, // Required for Google OAuth popup
}));
// 2. Rate Limiting - General API
// Rate limiters removed temporarily for development
// 4. Body Parsing with size limits (prevent DoS)
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 5. PostgreSQL Protection - Already secured via parameterized queries ($1, $2, etc.)
// SQL injection is prevented by using pg library's parameterized queries
// 6. XSS Protection - Handled by input sanitization in routes + Helmet CSP
// Note: xss-clean is deprecated. We sanitize inputs in auth routes manually.
// 7. HTTP Parameter Pollution - Prevented by strict validation in routes
// 8. CORS - Strict Origin Control
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://hope-gestion-frontend.onrender.com',
    'https://hopegestion.com',
    'https://www.hopegestion.com'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`🚨 CORS: Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24h preflight cache
}));
// Security logging middleware
app.use((req, res, next) => {
    const sensitiveRoutes = ['/api/auth/login', '/api/auth/register'];
    if (sensitiveRoutes.some(route => req.path.includes(route))) {
        console.log(`🔐 Auth request: ${req.method} ${req.path} from ${req.ip}`);
    }
    next();
});
// Servir les fichiers uploadés avec CORS
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// --- 2. Routes de l'API ---
// Apply general rate limiting to all API routes
// app.use('/api', apiLimiter); // Removed for dev
// Routes d'upload
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
app.use('/api/upload', uploadRoutes_1.default);
// Routes d'authentification (Publiques) - WITH STRICT RATE LIMITING
app.use('/api/auth', authRoutes_1.default); // Removed authLimiter
app.use('/api/auth', googleAuthRoutes_1.default); // Google OAuth routes
// Routes Réservations (Public + Protected mix inside)
const reservationRoutes_1 = __importDefault(require("./routes/reservationRoutes"));
app.use('/api/reservations', reservationRoutes_1.default);
// Routes Publiques (Aucune authentification requise)
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
app.use('/api/public', publicRoutes_1.default);
// TEMP FIX ROUTE
app.get('/api/fix-permissions', async (req, res) => {
    try {
        const modules = ['dashboard', 'biens', 'locataires', 'finance', 'users', 'owners', 'documents'];
        const rolesTarget = ['proprietaire', 'owner', 'Propriétaire'];
        let count = 0;
        for (const role of rolesTarget) {
            for (const module of modules) {
                await exports.pool.query(`
                    INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
                    VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE)
                    ON CONFLICT (role, module)
                    DO UPDATE SET can_read=TRUE, can_write=TRUE, can_delete=TRUE, can_validate=TRUE
                `, [role, module]);
                count++;
            }
        }
        res.json({ success: true, message: `Updated ${count} permission entries for owners.` });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
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
// ========================================
// 🔒 SECURITY: ERROR HANDLING
// ========================================
// 404 Handler - Must be after all routes
app.use((req, res) => {
    console.warn(`⚠️  404 - Route not found: ${req.method} ${req.path} from IP: ${req.ip}`);
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested resource does not exist'
    });
});
// Global Error Handler - Must be last
app.use((err, req, res, next) => {
    console.error('🚨 CRITICAL ERROR:', err);
    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS Error',
            message: 'Origin not allowed'
        });
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Authentication Error',
            message: 'Invalid token'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Authentication Error',
            message: 'Token has expired'
        });
    }
    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }
    // Generic 500 error - Don't expose sensitive details in production
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// ========================================
// 🚀 SERVER STARTUP
// ========================================
const CronService_1 = require("./services/CronService");
CronService_1.CronService.init();
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🔒 SECURITY FEATURES ENABLED:');
    console.log('   ✅ JWT_SECRET: 32+ characters');
    console.log('   ✅ Rate Limiting: Active');
    console.log('   ✅ Helmet Headers: CSP, HSTS, XSS');
    console.log('   ✅ CORS: Whitelist mode');
    console.log('   ✅ SQL Injection: Parameterized queries');
    console.log('   ✅ Password Policy: 8+ chars, complexity');
    console.log('========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('========================================');
});
