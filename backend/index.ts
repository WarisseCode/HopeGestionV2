// backend/index.ts
// Force restart
import express, { Request, Response } from 'express';
import path from 'path';
import { Pool } from 'pg'; 
import authRoutes from './routes/authRoutes';
import googleAuthRoutes from './routes/googleAuthRoutes';
import locataireRoutes from './routes/locataireRoutes'; // <--- AJOUT
import bienRoutes from './routes/bienRoutes';           // <--- AJOUT
import bauxRoutes from './routes/bauxRoutes';
import paiementRoutes from './routes/paiementRoutes';
import depenseRoutes from './routes/depenseRoutes';

import dashboardRoutes from './routes/dashboardRoutes';
import compteRoutes from './routes/compteRoutes';
import ownerRoutes from './routes/ownerRoutes';
import documentRoutes from './routes/documentRoutes';
import delegationRoutes from './routes/delegationRoutes';
import calendarRoutes from './routes/calendarRoutes';

import auditRoutes from './routes/auditRoutes';
import mobileMoneyRoutes from './routes/mobileMoneyRoutes';
import alertRoutes from './routes/alertRoutes';

import { protect, AuthenticatedRequest } from './middleware/authMiddleware'; 

// -------------------------********************-------------------------///

// Configuration
import { JWT_SECRET } from './config/config';

// Configuration de la Base de Données
import sharedPool from './db/database';
export const pool = sharedPool;

const app = express();
const PORT = process.env.PORT || 5000;

// Railway / Render / Heroku : derrière un reverse proxy
app.set('trust proxy', 1);

console.log('✅ JWT_SECRET validation passed');

// Auto-seed Super Admin if none exists
import { seedSuperAdmin } from './scripts/seedAdmin';
import { runMigrations } from './scripts/runMigrations';

pool.connect()
    .then(async client => {
        console.log('Successfully connected to PostgreSQL!');
        client.release();
        await runMigrations();
        await seedSuperAdmin();
        startServer();
    })
    .catch(err => {
        console.error('❌ Impossible de se connecter à PostgreSQL:', err.message);
        process.exit(1);
    });

// ========================================
// 🔒 SECURITY MIDDLEWARE STACK
// ========================================
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// Note: Using PostgreSQL, no need for mongo-sanitize (MongoDB-specific)

// 1. Security Headers (Helmet)
app.use(helmet({
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
    crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Requis pour les Popups Google OAuth
}));

// 2. Rate Limiting
// 1000 req/15min ≈ 66 req/min : suffisant pour une SPA avec polling de notifications
// et plusieurs appels API au chargement de page, sans ouvrir la porte aux scrapers.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});

// Auth strict : 20 tentatives/15min pour bloquer le brute-force sur /login
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' },
    skipSuccessfulRequests: true,
});

// 4. Body Parsing with size limits (prevent DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. PostgreSQL Protection - Already secured via parameterized queries ($1, $2, etc.)
// SQL injection is prevented by using pg library's parameterized queries

// 6. XSS Protection - Handled by input sanitization in routes + Helmet CSP
// Note: xss-clean is deprecated. We sanitize inputs in auth routes manually.

// 7. HTTP Parameter Pollution - Prevented by strict validation in routes

// 8. CORS - Strict Origin Control
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://hope-gestion-frontend.vercel.app',
    'https://hopegestion.com',
    'https://www.hopegestion.com'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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

// Servir les fichiers uploadés avec CORS restreint (mêmes origins que l'API)
app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Cross-Origin-Resource-Policy', 'same-site');
    next();
}, express.static(path.join(__dirname, '../uploads')));

// --- 2. Routes de l'API ---

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// Routes d'upload
import uploadRoutes from './routes/uploadRoutes';
app.use('/api/upload', uploadRoutes);

// Routes d'authentification (Publiques) - WITH STRICT RATE LIMITING
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, googleAuthRoutes);  // Google OAuth routes

// Routes Réservations (Public + Protected mix inside)
import reservationRoutes from './routes/reservationRoutes';
app.use('/api/reservations', reservationRoutes);

// Routes Publiques (Aucune authentification requise)
import publicRoutes from './routes/publicRoutes';
app.use('/api/public', publicRoutes);

// Routes Invitations
// validate/:token et :token/accept sont publics ; POST / requiert protect (vérifié dans le handler)
import invitationRoutes from './routes/invitationRoutes';
app.use('/api/invitations', invitationRoutes);

// --- Routes Protégées ---
// Routes Locataires (Nécessite le jeton JWT)
app.use('/api/locataires', protect, locataireRoutes); // <--- NOUVELLE LIGNE

// Routes Biens Immobiliers (Nécessite le jeton JWT)
app.use('/api/biens', protect, bienRoutes); // <--- NOUVELLE LIGNE

app.use('/api/baux', protect, bauxRoutes);

app.use('/api/paiements', protect, paiementRoutes);

app.use('/api/depenses', protect, depenseRoutes);

app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/compte', protect, compteRoutes);
app.use('/api/owners', protect, ownerRoutes);
app.use('/api/documents', protect, documentRoutes);
app.use('/api/delegations', protect, delegationRoutes);
app.use('/api/calendar', protect, calendarRoutes);
app.use('/api/audit-logs', protect, auditRoutes);

// Routes Mobile Money
app.use('/api/mobile-money', protect, mobileMoneyRoutes);
// Routes Notifications
import notificationRoutes from './routes/notificationRoutes';
app.use('/api/notifications', protect, notificationRoutes);

// Routes Tenant Access (Portal Control)
import tenantAccessRoutes from './routes/tenantAccessRoutes';
app.use('/api/tenant-access', protect, tenantAccessRoutes);
// Routes Alertes
app.use('/api/alertes', protect, alertRoutes);

// Routes Permissions (Matrice)
import permissionRoutes from './routes/permissionRoutes';
app.use('/api/permissions', protect, permissionRoutes);

// Routes User-Owner Assignments (Affectation)
import userAssignmentRoutes from './routes/userAssignmentRoutes';
app.use('/api/user-assignments', protect, userAssignmentRoutes);

// Routes Locations/Baux
import leaseRoutes from './routes/leaseRoutes';
app.use('/api/locations', protect, leaseRoutes);

// Routes Finances
// Routes Finances
import financeRoutes from './routes/financeRoutes';
import expenseRoutes from './routes/expenseRoutes';
import loanRoutes from './routes/loanRoutes';
import taxRoutes from './routes/taxRoutes';
import templateRoutes from './routes/templateRoutes';
import notebookRoutes from './routes/notebookRoutes';

app.use('/api/finances', protect, financeRoutes);
app.use('/api/expenses', protect, expenseRoutes);
app.use('/api/loans', protect, loanRoutes);
app.use('/api/tax', protect, taxRoutes);

// Routes Quittances manuelles (génération hors flux de paiement, persistées)
import quittanceRoutes from './routes/quittanceRoutes';
app.use('/api/quittances', protect, quittanceRoutes);

app.use('/api/templates', protect, templateRoutes);
app.use('/api/carnet', protect, notebookRoutes);

// Routes Inventaires (États des lieux)
import inventoryRoutes from './routes/inventoryRoutes';
app.use('/api/inventories', protect, inventoryRoutes);

// Routes États des Lieux (Inspections juridiques)
import edlRoutes from './routes/edlRoutes';
app.use('/api/edl', protect, edlRoutes);

// Module XIII - Interventions
import providerRoutes from './routes/providerRoutes';
import ticketRoutes from './routes/ticketRoutes';
import serviceContractRoutes from './routes/serviceContractRoutes';

app.use('/api/providers', protect, providerRoutes);
app.use('/api/tickets', protect, ticketRoutes);
app.use('/api/service-contracts', protect, serviceContractRoutes);

// Module XIV - Tâches & Messages
import taskRoutes from './routes/taskRoutes';
import messageRoutes from './routes/messageRoutes';

app.use('/api/tasks', protect, taskRoutes);
app.use('/api/messages', protect, messageRoutes);

// Routes Abonnements (Subscriptions)
import subscriptionRoutes from './routes/subscriptionRoutes';
app.use('/api/subscriptions', subscriptionRoutes); // Mix of public (plans) and protected routes

// Routes Webhooks FedaPay (paiements)
import fedapayWebhookRoutes from './routes/fedapayWebhookRoutes';
app.use('/api/webhooks/fedapay', fedapayWebhookRoutes);

// Webhook de déploiement (GitHub Actions → HTTPS, sans SSH)
import deployRoutes from './routes/deployRoutes';
app.use('/api/deploy', deployRoutes);

// Routes Rent Payments (Paiement en ligne des loyers)
import rentPaymentRoutes from './routes/rentPaymentRoutes';
app.use('/api/rent-payments', protect, rentPaymentRoutes);

// Route Test Protégée (pour validation rapide de 'protect')
// Route Test Protégée (pour validation rapide de 'protect')
app.get('/api/profil', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userResult = await pool.query('SELECT nom, email, user_type, role FROM users WHERE id = $1', [req.userId]);
        
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
    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du profil.' });
    }
});

import adminRoutes, { acceptAdminInvite, checkAdminInvite } from './routes/adminRoutes';
app.use('/api/admin', protect, adminRoutes);

// Public routes for admin invitation (no auth required)
app.get('/api/admin-invite/check', checkAdminInvite);
app.post('/api/admin-invite/accept', acceptAdminInvite);


// ========================================
// 📄 DOCUMENTATION API (Swagger UI)
// ========================================
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HopeGestion API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: { persistAuthorization: true },
}));

// Endpoint JSON brut (utile pour import Postman / Insomnia)
app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// --- 3. Test de communication (Endpoint de Ping) ---
app.get('/api/ping', (req: Request, res: Response) => {
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
import { CronService } from './services/CronService';

function startServer() {
    CronService.init();
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
}