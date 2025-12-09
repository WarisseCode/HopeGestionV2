// backend/routes/depenseRoutes.ts

import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

dotenv.config();

const router = Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});


// POST /api/depenses : Enregistrer une nouvelle dépense
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé : Seul le gestionnaire peut créer une dépense.' });
    }

    const {
        id_bien,
        date_depense,
        montant,
        categorie,
        description
    } = req.body;
    
    const gestionnaireId = req.userId;

    if (!id_bien || !date_depense || !montant || !categorie) {
        return res.status(400).json({ message: 'Champs obligatoires manquants : id_bien, date_depense, montant, categorie.' });
    }
    
    try {
        const bienCheck = await pool.query('SELECT id FROM biens WHERE id = $1 AND id_gestionnaire = $2', [id_bien, gestionnaireId]);
        
        if (bienCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Bien non trouvé ou vous n\'êtes pas le gestionnaire de ce bien.' });
        }

        const result = await pool.query(
            `INSERT INTO depenses (
                id_bien, id_gestionnaire, date_depense, montant, categorie, description
             ) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
                id_bien,
                gestionnaireId,
                date_depense,
                montant,
                categorie,
                description || null
            ]
        );

        res.status(201).json({ 
            message: 'Dépense enregistrée avec succès.', 
            depenseId: result.rows[0].id
        });

    } catch (error: any) {
        console.error('Erreur enregistrement dépense:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement de la dépense.' });
    }
});


// GET /api/depenses : Lister toutes les dépenses du gestionnaire
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    const gestionnaireId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT 
                d.id AS depense_id, 
                d.montant, 
                d.date_depense, 
                d.categorie, 
                d.description,
                b.adresse,
                b.ville
             FROM depenses d
             JOIN biens b ON b.id = d.id_bien
             WHERE d.id_gestionnaire = $1
             ORDER BY d.date_depense DESC`,
            [gestionnaireId]
        );
        
        res.status(200).json(result.rows);
        
    } catch (error) {
        console.error('Erreur liste dépenses:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des dépenses.' });
    }
});


// PUT /api/depenses/:id : Mettre à jour une dépense spécifique <--- NOUVELLE ROUTE
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const depenseId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    const { 
        id_bien,
        date_depense,
        montant,
        categorie,
        description
    } = req.body;

    let queryParts: string[] = [];
    let queryValues: any[] = [];
    let paramIndex = 1;

    if (id_bien !== undefined) {
        queryParts.push(`id_bien = $${paramIndex++}`);
        queryValues.push(id_bien);
    }
    if (date_depense !== undefined) {
        queryParts.push(`date_depense = $${paramIndex++}`);
        queryValues.push(date_depense);
    }
    if (montant !== undefined) {
        queryParts.push(`montant = $${paramIndex++}`);
        queryValues.push(montant);
    }
    if (categorie !== undefined) {
        queryParts.push(`categorie = $${paramIndex++}`);
        queryValues.push(categorie);
    }
    if (description !== undefined) {
        queryParts.push(`description = $${paramIndex++}`);
        queryValues.push(description);
    }

    if (queryParts.length === 0) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    queryValues.push(depenseId);
    queryValues.push(gestionnaireId);

    const updateQuery = `
        UPDATE depenses 
        SET ${queryParts.join(', ')}
        WHERE id = $${paramIndex++} AND id_gestionnaire = $${paramIndex}
        RETURNING id
    `;

    try {
        const result = await pool.query(updateQuery, queryValues);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Dépense non trouvée ou vous n\'êtes pas autorisé à la modifier.' });
        }

        res.status(200).json({ 
            message: 'Dépense mise à jour avec succès.', 
            depenseId: depenseId
        });

    } catch (error) {
        console.error('Erreur mise à jour dépense:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la dépense.' });
    }
});

// backend/routes/depenseRoutes.ts (Ajout de la route DELETE)

// DELETE /api/depenses/:id : Supprimer une dépense spécifique
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const depenseId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    try {
        const result = await pool.query(
            // Suppression conditionnelle : vérifie que la dépense appartient bien au gestionnaire
            `DELETE FROM depenses 
             WHERE id = $1 AND id_gestionnaire = $2
             RETURNING id`,
            [depenseId, gestionnaireId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Dépense non trouvée ou vous n\'êtes pas autorisé à la supprimer.' });
        }

        res.status(200).json({ 
            message: 'Dépense supprimée avec succès.', 
            depenseId: depenseId
        });

    } catch (error) {
        console.error('Erreur suppression dépense:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de la dépense.' });
    }
});

export default router;