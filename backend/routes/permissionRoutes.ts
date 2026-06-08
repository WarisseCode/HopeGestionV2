import { Router, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config';
import { validate } from '../middleware/validate';

const router = Router();

import pool from '../db/database';

// role + module forment la clé du upsert → obligatoires. Les droits sont des
// booléens optionnels (un upsert partiel ne réécrit que ce qui est fourni).
const matrixRules = [
    body('role').notEmpty().withMessage('role est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('role invalide'),
    body('module').notEmpty().withMessage('module est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('module invalide'),
    body('can_read').optional({ nullable: true }).isBoolean().withMessage('can_read doit être un booléen'),
    body('can_write').optional({ nullable: true }).isBoolean().withMessage('can_write doit être un booléen'),
    body('can_delete').optional({ nullable: true }).isBoolean().withMessage('can_delete doit être un booléen'),
    body('can_validate').optional({ nullable: true }).isBoolean().withMessage('can_validate doit être un booléen'),
];

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
router.put('/matrix', verifyToken, validate(matrixRules), async (req: any, res: Response) => {
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
