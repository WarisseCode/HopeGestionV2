import { Router } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = Router();

import pool from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware d'auth simplifié (à factoriser idéalement)
const verifyToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Accès refusé.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Token invalide.' });
        req.user = user;
        next();
    });
};

// GET /api/permissions/matrix
// Récupère toute la matrice des permissions
router.get('/matrix', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permission_matrix ORDER BY role, module');
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur fetch permissions:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// PUT /api/permissions/matrix
// Met à jour une ligne de permission
router.put('/matrix', verifyToken, async (req: any, res) => {
    // Seul l'admin peut modifier les permissions
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Seul l\'administrateur peut modifier les permissions.' });
    }

    const { role, module, can_read, can_write, can_delete, can_validate } = req.body;

    try {
        await pool.query(
            `INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (role, module) 
             DO UPDATE SET 
             can_read = EXCLUDED.can_read,
             can_write = EXCLUDED.can_write,
             can_delete = EXCLUDED.can_delete,
             can_validate = EXCLUDED.can_validate`,
            [role, module, can_read, can_write, can_delete, can_validate]
        );
        res.json({ message: 'Permissions mises à jour.' });
    } catch (error) {
        console.error('Erreur update permissions:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;
