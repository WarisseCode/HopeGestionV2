// backend/routes/locataireRoutes.ts

import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/authMiddleware'; // Pour accéder à req.userRole

dotenv.config();

const router = Router();
// Réplicat de la configuration de la DB pour l'accès
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
const SALT_ROUNDS = 10; 


// POST /api/locataires : Créer un nouveau locataire (Protégé par 'protect')
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Seul le gestionnaire peut effectuer cette action.
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé : Autorisé seulement pour le gestionnaire.' });
    }

    const { email, password, prenom, nom, numero_telephone, numero_piece_identite } = req.body;
    
    if (!email || !password || !prenom || !nom) {
        return res.status(400).json({ message: 'Champs essentiels manquants (email, password, prenom, nom).' });
    }
    
    try {
        // Hachage du mot de passe (Sécurité)
        const mot_de_passe_hache = await bcrypt.hash(password, SALT_ROUNDS);

        // --- 1. Création de l'utilisateur (Rôle: locataire) ---
        const userResult = await pool.query(
            `INSERT INTO utilisateurs (email, mot_de_passe_hache, role, prenom, nom) 
             VALUES ($1, $2, 'locataire', $3, $4) RETURNING id`,
            [email, mot_de_passe_hache, prenom, nom]
        );
        const userId = userResult.rows[0].id;

        // --- 2. Création de la fiche Locataire (Lien vers l'utilisateur) ---
        const locataireResult = await pool.query(
            `INSERT INTO locataires (id_utilisateur, numero_telephone, numero_piece_identite) 
             VALUES ($1, $2, $3) RETURNING id_locataire`, // <-- CORRECTION 1 : RETOURNE id_locataire
            [userId, numero_telephone, numero_piece_identite]
        );

        res.status(201).json({ 
            message: 'Locataire et compte utilisateur créé avec succès.', 
            locataireId: locataireResult.rows[0].id_locataire, // <-- CORRECTION 2 : Lit la propriété id_locataire
            userId: userId
        });

    } catch (error: any) {
        console.error('Erreur création locataire:', error);
        // Gérer l'erreur d'email déjà utilisé (code d'erreur PostgreSQL 23505)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Cet email ou numéro d\'identité est déjà utilisé.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du locataire.' });
    }
});


// GET /api/locataires : Lister tous les locataires (Protégé par 'protect')
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    try {
        const result = await pool.query(
            `SELECT 
                l.id_locataire, 
                u.id AS id_utilisateur, 
                u.prenom, 
                u.nom, 
                u.email, 
                l.numero_telephone, 
                l.numero_piece_identite
             FROM locataires l
             JOIN utilisateurs u ON u.id = l.id_utilisateur`
        );
        
        res.status(200).json(result.rows);
        
    } catch (error) {
        console.error('Erreur liste locataires:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des locataires.' });
    }
});

// PUT /api/locataires/:id : Mettre à jour un locataire spécifique
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    // Utilisation de l'opérateur ! pour contourner l'erreur TS2345
    const locataireId = parseInt(req.params.id!, 10);
    const { prenom, nom, email, numero_telephone, numero_piece_identite } = req.body;
    
    // Si aucun champ n'est fourni, on sort
    if (!prenom && !nom && !email && !numero_telephone && !numero_piece_identite) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour fourni.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Démarrer la transaction

        // --- 1. Mettre à jour l'utilisateur si les champs sont fournis ---
        if (prenom || nom || email) {
            
            // Trouver l'ID utilisateur lié au locataireId
            const locataireCheck = await client.query('SELECT id_utilisateur FROM locataires WHERE id_locataire = $1', [locataireId]);
            if (locataireCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Locataire non trouvé.' });
            }
            const userId = locataireCheck.rows[0].id_utilisateur;

            let userQueryParts: string[] = [];
            let userQueryValues: any[] = [];
            let userParamIndex = 1;
            
            if (prenom !== undefined) {
                userQueryParts.push(`prenom = $${userParamIndex++}`);
                userQueryValues.push(prenom);
            }
            if (nom !== undefined) {
                userQueryParts.push(`nom = $${userParamIndex++}`);
                userQueryValues.push(nom);
            }
            if (email !== undefined) {
                userQueryParts.push(`email = $${userParamIndex++}`);
                userQueryValues.push(email);
            }

            if (userQueryParts.length > 0) {
                userQueryValues.push(userId);
                const userUpdateQuery = `
                    UPDATE utilisateurs 
                    SET ${userQueryParts.join(', ')}
                    WHERE id = $${userParamIndex}
                `;
                await client.query(userUpdateQuery, userQueryValues);
            }
        }


        // --- 2. Mettre à jour la fiche Locataire ---
        let locataireQueryParts: string[] = [];
        let locataireQueryValues: any[] = [];
        let locataireParamIndex = 1;

        if (numero_telephone !== undefined) {
            locataireQueryParts.push(`numero_telephone = $${locataireParamIndex++}`);
            locataireQueryValues.push(numero_telephone);
        }
        if (numero_piece_identite !== undefined) {
            locataireQueryParts.push(`numero_piece_identite = $${locataireParamIndex++}`);
            locataireQueryValues.push(numero_piece_identite);
        }

        if (locataireQueryParts.length > 0) {
            locataireQueryValues.push(locataireId);
            const locataireUpdateQuery = `
                UPDATE locataires
                SET ${locataireQueryParts.join(', ')}
                WHERE id_locataire = $${locataireParamIndex}
                RETURNING id_locataire
            `;
            const result = await client.query(locataireUpdateQuery, locataireQueryValues);
            
            // Si la mise à jour de locataire était le seul objectif
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Locataire non trouvé.' });
            }
        }

        await client.query('COMMIT'); // Valider la transaction

        res.status(200).json({ 
            message: 'Informations locataire mises à jour avec succès.', 
            locataireId: locataireId
        });

    } catch (error: any) {
        await client.query('ROLLBACK'); // Annuler en cas d'erreur
        console.error('Erreur mise à jour locataire:', error);
        
        if (error.code === '23505') { // Gestion de l'email ou CIN déjà utilisé
            return res.status(409).json({ message: 'Cet email ou numéro d\'identité est déjà utilisé par un autre utilisateur.' });
        }
        
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du locataire.' });
    } finally {
        client.release(); // Relâcher le client
    }
});

// backend/routes/locataireRoutes.ts (Route DELETE CORRIGÉE)

// DELETE /api/locataires/:id : Supprimer un locataire spécifique
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const locataireId = parseInt(req.params.id!, 10);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Démarrer la transaction

        // --- 1. Vérification : Locataire lié à un bail actif ? ---
        const activeBailCheck = await client.query(
            'SELECT COUNT(*) FROM baux WHERE id_locataire = $1 AND statut = $2',
            [locataireId, 'Actif']
        );

        if (parseInt(activeBailCheck.rows[0].count, 10) > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ 
                message: 'Impossible de supprimer le locataire. Il est lié à un bail actif.' 
            });
        }
        
        // --- 2. Supprimer TOUS les baux (terminés) liés à ce locataire ---
        // Ceci est la correction nécessaire pour satisfaire la contrainte RESTRICT de la base de données
        await client.query(
            'DELETE FROM baux WHERE id_locataire = $1',
            [locataireId]
        );

        
        // --- 3. Récupérer l'ID utilisateur lié avant la suppression du locataire ---
        const locataireCheck = await client.query(
            'SELECT id_utilisateur FROM locataires WHERE id_locataire = $1',
            [locataireId]
        );

        if (locataireCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Locataire non trouvé.' });
        }
        const userId = locataireCheck.rows[0].id_utilisateur;


        // --- 4. Suppression de la fiche Locataire ---
        await client.query('DELETE FROM locataires WHERE id_locataire = $1', [locataireId]);

        
        // --- 5. Suppression du compte Utilisateur lié ---
        await client.query('DELETE FROM utilisateurs WHERE id = $1 AND role = $2', [userId, 'locataire']);


        await client.query('COMMIT'); // Valider la transaction

        res.status(200).json({ 
            message: 'Locataire et baux associés supprimés avec succès.', 
            locataireId: locataireId
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Annuler en cas d'erreur
        console.error('Erreur suppression locataire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du locataire.' });
    } finally {
        client.release();
    }
});

export default router;