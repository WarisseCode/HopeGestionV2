// backend/routes/bauxRoutes.ts

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


// POST /api/baux : Créer un nouveau contrat de bail
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Seul le gestionnaire peut créer un bail.
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé : Seul le gestionnaire peut créer un bail.' });
    }

    const {
        id_bien,
        id_locataire,
        date_debut,
        date_fin, // Optionnel
        loyer_actuel,
        depot_garantie
    } = req.body;

    if (!id_bien || !id_locataire || !date_debut || !loyer_actuel) {
        return res.status(400).json({ message: 'Champs essentiels manquants pour le bail.' });
    }
    
    // Le statut initial est 'Actif' par défaut lors de la création
    const statut = 'Actif';
    
    try {
        // Insertion dans la table BAUX
        const result = await pool.query(
            `INSERT INTO baux (
                id_bien, id_locataire, date_debut, date_fin, loyer_actuel, depot_garantie, statut
             ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [
                id_bien,
                id_locataire,
                date_debut,
                date_fin,
                loyer_actuel,
                depot_garantie || null, // Permet à depot_garantie d'être NULL si non fourni
                statut
            ]
        );

        // Mettre à jour le statut du bien à 'Occupé'
        // C'est une opération métier cruciale
        await pool.query(
            `UPDATE biens
             SET statut_occupation = 'Occupé'
             WHERE id = $1`,
            [id_bien]
        );

        res.status(201).json({ 
            message: 'Contrat de bail créé avec succès. Le bien a été marqué comme "Occupé".', 
            bailId: result.rows[0].id
        });

    } catch (error: any) {
        console.error('Erreur création bail:', error);
        // Gérer le cas où le bien est déjà lié à un bail "Actif" (clé UNIQUE)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Ce bien est déjà associé à un bail actif.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du bail.' });
    }
});


// PUT /api/baux/:id : Mettre à jour un contrat de bail spécifique
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const bailId = parseInt(req.params.id!, 10);
    const { date_fin, loyer_actuel, depot_garantie, statut } = req.body;
    
    // Si aucun champ n'est fourni, on sort
    if (!date_fin && !loyer_actuel && !depot_garantie && !statut) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Démarrer la transaction

        // --- 1. Créer la requête de mise à jour pour le Bail ---
        let queryParts: string[] = [];
        let queryValues: any[] = [];
        let paramIndex = 1;

        if (date_fin !== undefined) {
            queryParts.push(`date_fin = $${paramIndex++}`);
            queryValues.push(date_fin);
        }
        if (loyer_actuel !== undefined) {
            queryParts.push(`loyer_actuel = $${paramIndex++}`);
            queryValues.push(loyer_actuel);
        }
        if (depot_garantie !== undefined) {
            queryParts.push(`depot_garantie = $${paramIndex++}`);
            queryValues.push(depot_garantie);
        }
        if (statut !== undefined) {
            queryParts.push(`statut = $${paramIndex++}`);
            queryValues.push(statut);
        }
        
        // Exécution de l'UPDATE
        queryValues.push(bailId);
        const updateQuery = `
            UPDATE baux 
            SET ${queryParts.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id_bien, statut
        `;
        
        const result = await client.query(updateQuery, queryValues);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Bail non trouvé.' });
        }

        const { id_bien, statut: nouveauStatut } = result.rows[0];


        // --- 2. Logique Métier : Mettre à jour le statut du Bien si le Bail est terminé ---
        if (nouveauStatut === 'Terminé' || nouveauStatut === 'Résilié') {
            await client.query(
                `UPDATE biens
                 SET statut_occupation = 'Disponible'
                 WHERE id = $1`,
                [id_bien]
            );
        } else if (nouveauStatut === 'Actif' && id_bien) {
             // S'assurer que le bien est bien marqué "Occupé" s'il est actif
             await client.query(
                `UPDATE biens
                 SET statut_occupation = 'Occupé'
                 WHERE id = $1`,
                [id_bien]
            );
        }

        await client.query('COMMIT'); // Valider la transaction

        res.status(200).json({ 
            message: `Bail ID ${bailId} mis à jour.`, 
            nouveauStatutBien: (nouveauStatut === 'Terminé' || nouveauStatut === 'Résilié') ? 'Disponible' : 'Occupé',
            bailId: bailId
        });

    } catch (error: any) {
        await client.query('ROLLBACK'); // Annuler en cas d'erreur
        console.error('Erreur mise à jour bail:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du bail.' });
    } finally {
        client.release(); // Relâcher le client
    }
});

export default router;