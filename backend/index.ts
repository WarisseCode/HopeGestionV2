// backend/index.ts

// Importations de base
import express, { Request, Response } from 'express';
//import cors from 'cors';
import * as dotenv from 'dotenv';
import { Pool } from 'pg'; 
import authRoutes from './routes/authRoutes';
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

import { protect, AuthenticatedRequest } from './middleware/authMiddleware'; 

// -------------------------********************-------------------------///

// Charger les variables d'environnement
dotenv.config();

// Configuration de la Base de Données
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

const app = express();
const PORT = process.env.PORT || 5000; 

pool.connect()
    .then(client => {
        console.log('Successfully connected to PostgreSQL!');
        client.release(); 
    })
    .catch(err => {
        console.error('Warning: Error connecting to PostgreSQL:', err.stack);
        console.log('Continuing to start server without database connection...');
    });

import cors from 'cors';    
// --- 1. Middleware essentiels ---
app.use(express.json()); 
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://hope-gestion-frontend.onrender.com',
            process.env.FRONTEND_URL,
            process.env.RENDER_EXTERNAL_URL
        ].filter(Boolean); // Filtre les valeurs undefined/null
        
        // En développement, autoriser localhost
        if (process.env.NODE_ENV !== 'production' || !origin) {
            callback(null, true);
            return;
        }
        
        // Vérifier si l'origine est dans la liste autorisée
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- 2. Routes de l'API ---
// Routes d'authentification (Publiques)
app.use('/api/auth', authRoutes);

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

// --- 3. Test de communication (Endpoint de Ping) ---
app.get('/api/ping', (req: Request, res: Response) => {
    res.status(200).json({ 
        message: 'Pong! API HopeGestionV2 opérationnelle.',
        timestamp: new Date().toISOString(),
    });
});

// --- 4. Démarrage du serveur ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});