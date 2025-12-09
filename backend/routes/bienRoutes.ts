// backend/routes/bienRoutes.ts

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


// POST /api/biens : Créer un nouveau bien
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    // Seul le gestionnaire peut créer un bien.
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé : Seul le gestionnaire peut créer un bien.' });
    }

    // Récupérer l'ID du gestionnaire depuis le jeton JWT
    const gestionnaireId = req.userId;
    
    // Champs essentiels pour un Bien
    const { 
        type_bien, 
        adresse, 
        ville, 
        code_postal, 
        nombre_pieces, 
        surface_m2,
        loyer_mensuel_initial
    } = req.body;
    
    if (!adresse || !loyer_mensuel_initial) {
        return res.status(400).json({ message: 'Champs obligatoires manquants (adresse, loyer_mensuel_initial).' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO biens (
                id_gestionnaire, type_bien, adresse, ville, code_postal, nombre_pieces, surface_m2, loyer_mensuel_initial
             ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id`,
            [
                gestionnaireId, 
                type_bien || 'Non spécifié', 
                adresse, 
                ville, 
                code_postal || null, 
                nombre_pieces || 1, 
                surface_m2 || null, 
                loyer_mensuel_initial
            ]
        );

        res.status(201).json({ 
            message: 'Bien immobilier créé avec succès.', 
            bienId: result.rows[0].id
        });

    } catch (error) {
        console.error('Erreur création bien:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la création du bien.' });
    }
});


// GET /api/biens : Lister tous les biens du gestionnaire
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    // Récupérer l'ID du gestionnaire depuis le jeton JWT
    const gestionnaireId = req.userId;
    
    try {
        // Sélectionner uniquement les biens liés au gestionnaire connecté
        const result = await pool.query(
            `SELECT 
                id, 
                type_bien, 
                adresse, 
                ville, 
                loyer_mensuel_initial,
                statut_occupation 
             FROM biens 
             WHERE id_gestionnaire = $1
             ORDER BY adresse`,
            [gestionnaireId]
        );
        
        res.status(200).json(result.rows);
        
    } catch (error) {
        console.error('Erreur liste biens:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des biens.' });
    }
});


// PUT /api/biens/:id : Mettre à jour un bien spécifique <--- ROUTE CORRIGÉE
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    // CORRECTION : Utiliser l'opérateur ! pour affirmer que 'id' n'est pas undefined
    const bienId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    const { 
        type_bien, 
        adresse, 
        ville, 
        code_postal, 
        nombre_pieces, 
        surface_m2,
        loyer_mensuel_initial,
        statut_occupation 
    } = req.body;

    // Créer la requête de mise à jour dynamique pour gérer les champs optionnels
    let queryParts: string[] = [];
    let queryValues: any[] = [];
    let paramIndex = 1;

    // Vérifier et ajouter chaque champ au besoin
    if (type_bien !== undefined) {
        queryParts.push(`type_bien = $${paramIndex++}`);
        queryValues.push(type_bien);
    }
    if (adresse !== undefined) {
        queryParts.push(`adresse = $${paramIndex++}`);
        queryValues.push(adresse);
    }
    if (ville !== undefined) {
        queryParts.push(`ville = $${paramIndex++}`);
        queryValues.push(ville);
    }
    if (code_postal !== undefined) {
        queryParts.push(`code_postal = $${paramIndex++}`);
        queryValues.push(code_postal);
    }
    if (nombre_pieces !== undefined) {
        queryParts.push(`nombre_pieces = $${paramIndex++}`);
        queryValues.push(nombre_pieces);
    }
    if (surface_m2 !== undefined) {
        queryParts.push(`surface_m2 = $${paramIndex++}`);
        queryValues.push(surface_m2);
    }
    if (loyer_mensuel_initial !== undefined) {
        queryParts.push(`loyer_mensuel_initial = $${paramIndex++}`);
        queryValues.push(loyer_mensuel_initial);
    }
    if (statut_occupation !== undefined) {
        queryParts.push(`statut_occupation = $${paramIndex++}`);
        queryValues.push(statut_occupation);
    }

    if (queryParts.length === 0) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    // Ajout des conditions WHERE
    queryValues.push(bienId);
    queryValues.push(gestionnaireId);

    const updateQuery = `
        UPDATE biens 
        SET ${queryParts.join(', ')}, date_creation = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex++} AND id_gestionnaire = $${paramIndex}
        RETURNING id
    `;

    try {
        const result = await pool.query(updateQuery, queryValues);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bien non trouvé ou vous n\'êtes pas autorisé à le modifier.' });
        }

        res.status(200).json({ 
            message: 'Bien immobilier mis à jour avec succès.', 
            bienId: bienId
        });

    } catch (error) {
        console.error('Erreur mise à jour bien:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du bien.' });
    }
});

// backend/routes/bienRoutes.ts (Ajout de la route DELETE)

// DELETE /api/biens/:id : Supprimer un bien spécifique
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const bienId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    try {
        const result = await pool.query(
            // Suppression conditionnelle : s'assurer que le gestionnaire est bien le propriétaire
            `DELETE FROM biens 
             WHERE id = $1 AND id_gestionnaire = $2
             RETURNING id`,
            [bienId, gestionnaireId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bien non trouvé ou vous n\'êtes pas autorisé à le supprimer.' });
        }

        res.status(200).json({ 
            message: 'Bien immobilier, baux et dépendances associés supprimés avec succès.', 
            bienId: bienId
        });

    } catch (error) {
        console.error('Erreur suppression bien:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du bien.' });
    }
});

export default router;