// backend/routes/templateRoutes.ts
import { Router, Response } from 'express';
import pool from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';

const router = Router();

// GET /api/templates - List
router.get('/', permissions.canRead('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM document_templates ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/templates/:id - Detail
router.get('/:id', permissions.canRead('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM document_templates WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Modèle introuvable' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/templates - Create
router.post('/', permissions.canWrite('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, type, content } = req.body;
        const result = await pool.query(
            'INSERT INTO document_templates (name, type, content) VALUES ($1, $2, $3) RETURNING *',
            [name, type, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création modèle' });
    }
});

// PUT /api/templates/:id - Update
router.put('/:id', permissions.canWrite('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, content } = req.body;
        const result = await pool.query(
            'UPDATE document_templates SET name = $1, type = $2, content = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, type, content, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Modèle introuvable' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur mise à jour' });
    }
});

// DELETE /api/templates/:id - Delete
router.delete('/:id', permissions.canWrite('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM document_templates WHERE id = $1', [id]);
        res.json({ message: 'Modèle supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

// GET /api/templates/variables/:type - Get available variables
router.get('/variables/:type', async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.params;
    let variables: string[] = [];

    switch (type) {
        case 'lease':
            variables = [
                '{{TenantName}}', '{{TenantPhone}}',
                '{{OwnerName}}', '{{OwnerPhone}}',
                '{{PropertyAddress}}', '{{PropertyType}}', '{{Floor}}',
                '{{RentAmount}}', '{{StartDate}}', '{{EndDate}}',
                '{{RefLot}}'
            ];
            break;
        case 'receipt':
            variables = [
                '{{TenantName}}',
                '{{Period}}',
                '{{Amount}}',
                '{{PropertyAddress}}',
                '{{Date}}'
            ];
            break;
        default:
            variables = ['{{Date}}', '{{Me}}'];
    }

    res.json(variables);
});

export default router;
