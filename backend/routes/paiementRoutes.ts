// backend/routes/paiementRoutes.ts

import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { isSameDay, startOfMonth } from 'date-fns'; // Importation nécessaire

dotenv.config();

const router = Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});


// POST /api/paiements : Enregistrer un nouveau paiement
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    
    const { id_bail, montant, methode_paiement, periode_couverte } = req.body;
    const date_paiement = new Date(); // Date actuelle de l'enregistrement

    if (!id_bail || !montant || !periode_couverte) {
        return res.status(400).json({ message: 'Champs obligatoires manquants : id_bail, montant, periode_couverte.' });
    }
    
    const statut_paiement = 'Payé';
    
    try {
        const bailCheck = await pool.query('SELECT id_locataire, loyer_actuel FROM baux WHERE id = $1 AND statut = \'Actif\'', [id_bail]);
        
        if (bailCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou inactif.' });
        }
        
        const loyerDu = bailCheck.rows[0].loyer_actuel;
        if (montant < loyerDu) {
            console.log(`Paiement partiel enregistré: ${montant} vs ${loyerDu}`);
        }

        const result = await pool.query(
            `INSERT INTO paiements (
                id_bail, montant, date_paiement, periode_couverte, methode_paiement, statut_paiement
             ) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
                id_bail,
                montant,
                date_paiement,
                periode_couverte,
                methode_paiement || 'Virement Bancaire',
                statut_paiement
            ]
        );

        res.status(201).json({ 
            message: `Paiement enregistré pour la période ${periode_couverte}.`, 
            paiementId: result.rows[0].id
        });

    } catch (error: any) {
        console.error('Erreur enregistrement paiement:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du paiement.' });
    }
});


// GET /api/paiements : Lister tous les paiements liés aux baux du gestionnaire
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    const gestionnaireId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT 
                p.id AS paiement_id, 
                p.montant, 
                p.date_paiement, 
                p.periode_couverte, 
                p.statut_paiement,
                b.id AS bail_id,
                bi.adresse,
                bi.ville
             FROM paiements p
             JOIN baux b ON b.id = p.id_bail
             JOIN biens bi ON bi.id = b.id_bien
             WHERE bi.id_gestionnaire = $1
             ORDER BY p.date_paiement DESC`,
            [gestionnaireId]
        );
        
        res.status(200).json(result.rows);
        
    } catch (error) {
        console.error('Erreur liste paiements:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des paiements.' });
    }
});


// PUT /api/paiements/:id : Mettre à jour un paiement spécifique <--- NOUVELLE ROUTE
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const paiementId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    const { 
        montant,
        methode_paiement,
        periode_couverte,
        statut_paiement
    } = req.body;

    let queryParts: string[] = [];
    let queryValues: any[] = [];
    let paramIndex = 1;

    if (montant !== undefined) {
        queryParts.push(`montant = $${paramIndex++}`);
        queryValues.push(montant);
    }
    if (methode_paiement !== undefined) {
        queryParts.push(`methode_paiement = $${paramIndex++}`);
        queryValues.push(methode_paiement);
    }
    if (periode_couverte !== undefined) {
        queryParts.push(`periode_couverte = $${paramIndex++}`);
        queryValues.push(periode_couverte);
    }
    if (statut_paiement !== undefined) {
        queryParts.push(`statut_paiement = $${paramIndex++}`);
        queryValues.push(statut_paiement);
    }

    if (queryParts.length === 0) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    // Requête de vérification de propriété via jointures (Sécurité)
    const checkQuery = `
        SELECT p.id
        FROM paiements p
        JOIN baux b ON b.id = p.id_bail
        JOIN biens bi ON bi.id = b.id_bien
        WHERE p.id = $1 AND bi.id_gestionnaire = $2
    `;
    
    try {
        const checkResult = await pool.query(checkQuery, [paiementId, gestionnaireId]);
        
        if (checkResult.rows.length === 0) {
             return res.status(404).json({ message: 'Paiement non trouvé ou vous n\'êtes pas autorisé à le modifier.' });
        }
        
        // Exécution de l'UPDATE
        queryValues.push(paiementId); 
        const updateQuery = `
            UPDATE paiements 
            SET ${queryParts.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id
        `;

        await pool.query(updateQuery, queryValues);

        res.status(200).json({ 
            message: 'Paiement mis à jour avec succès.', 
            paiementId: paiementId
        });

    } catch (error) {
        console.error('Erreur mise à jour paiement:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du paiement.' });
    }
});

// backend/routes/paiementRoutes.ts (Ajout de la route DELETE)

// DELETE /api/paiements/:id : Supprimer un paiement spécifique
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const paiementId = parseInt(req.params.id!, 10);
    const gestionnaireId = req.userId;
    
    try {
        // La suppression est conditionnée par l'appartenance du bien au gestionnaire
        // Jointure pour s'assurer que le paiement est lié à un bien géré par ce gestionnaire
        const result = await pool.query(
            `DELETE FROM paiements 
             WHERE id = $1 
             AND id_bail IN (
                 SELECT b.id 
                 FROM baux b 
                 JOIN biens bi ON bi.id = b.id_bien
                 WHERE bi.id_gestionnaire = $2
             )
             RETURNING id`,
            [paiementId, gestionnaireId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Paiement non trouvé ou vous n\'êtes pas autorisé à le supprimer.' });
        }

        res.status(200).json({ 
            message: 'Paiement supprimé avec succès.', 
            paiementId: paiementId
        });

    } catch (error) {
        console.error('Erreur suppression paiement:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du paiement.' });
    }
});

export default router;