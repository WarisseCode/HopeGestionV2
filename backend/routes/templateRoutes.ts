// backend/routes/templateRoutes.ts
import { Router, Response } from 'express';
import { pool } from '../index'; // Use the shared pool from index
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

// GET /api/templates/variables/:type - Get available variables with French labels
router.get('/variables/:type', async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.params;
    // eslint-disable-next-line no-useless-assignment
    let variables: { variable: string; label: string }[] = [];

    switch (type) {
        case 'lease':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Téléphone Locataire}}', label: 'Numéro de téléphone du locataire' },
                { variable: '{{Email Locataire}}', label: 'Adresse email du locataire' },
                { variable: '{{Nom du Propriétaire}}', label: 'Nom complet du propriétaire / bailleur' },
                { variable: '{{Téléphone Propriétaire}}', label: 'Numéro de téléphone du propriétaire' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien immobilier' },
                { variable: '{{Type de Bien}}', label: 'Type de bien (Appartement, Maison, etc.)' },
                { variable: '{{Étage}}', label: 'Étage du lot' },
                { variable: '{{Référence Lot}}', label: 'Référence du lot (ex: A01)' },
                { variable: '{{Montant du Loyer}}', label: 'Montant du loyer mensuel en FCFA' },
                { variable: '{{Date de Début}}', label: 'Date de début du bail' },
                { variable: '{{Date de Fin}}', label: 'Date de fin du bail' },
            ];
            break;
        case 'receipt':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Période}}', label: 'Période concernée (ex: Janvier 2026)' },
                { variable: '{{Montant Payé}}', label: 'Montant du paiement en FCFA' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien' },
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
            ];
            break;
        case 'notice':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien' },
                { variable: '{{Montant Dû}}', label: 'Montant impayé total' },
                { variable: '{{Nombre de Mois}}', label: 'Nombre de mois d\'impayés' },
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
            ];
            break;
        default:
            variables = [
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
                { variable: '{{Mon Nom}}', label: 'Votre nom (gestionnaire connecté)' },
            ];
    }

    res.json(variables);
});

export default router;

