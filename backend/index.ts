// backend/index.ts

// Importations de base
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { Pool } from 'pg'; 
import authRoutes from './routes/authRoutes';
import locataireRoutes from './routes/locataireRoutes'; // <--- AJOUT
import bienRoutes from './routes/bienRoutes';           // <--- AJOUT
import bauxRoutes from './routes/bauxRoutes';
import paiementRoutes from './routes/paiementRoutes';
import depenseRoutes from './routes/depenseRoutes';

import dashboardRoutes from './routes/dashboardRoutes';

import { protect, AuthenticatedRequest } from './middleware/authMiddleware'; 
// -------------------------********************-------------------------///

// Charger les variables d'environnement
dotenv.config();

// Configuration de la Base de Données
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

const app = express();
const PORT = process.env.PORT || 3001; 

pool.connect()
    .then(client => {
        console.log('Successfully connected to PostgreSQL!');
        client.release(); 
    })
    .catch(err => {
        console.error('Warning: Error connecting to PostgreSQL:', err.stack);
        console.log('Continuing to start server without database connection...');
    });

// --- 1. Middleware essentiels ---
app.use(express.json()); 
app.use(cors({
    origin: 'http://localhost:3000', 
    credentials: true, 
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

// Route Test Protégée (pour validation rapide de 'protect')
app.get('/api/profil', protect, (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ 
        message: `Bienvenue, votre ID est ${req.userId} et votre rôle est ${req.userRole}`,
    });
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