// backend/routes/bienRoutes.ts
import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { filterByOwner, buildOwnerWhereClause } from '../middleware/ownerIsolation';
import permissions from '../middleware/permissionMiddleware';

dotenv.config();

const router = Router();
import pool from '../db/database';

// GET /api/biens/immeubles : Récupérer la liste des immeubles (filtrés par accès propriétaire)
router.get('/immeubles', permissions.canRead('biens'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    // Note: filterByOwner middleware sets (req as any).ownerIds based on user access
    const ownerIds = (req as any).ownerIds;
    const whereClause = buildOwnerWhereClause(ownerIds);

    try {
        const query = `
            SELECT 
                b.id,
                b.nom,
                b.type,
                b.adresse,
                b.ville,
                b.pays,
                b.description,
                b.photo_url as photo,
                b.owner_id,
                b.latitude,
                b.longitude,
                b.quartier,
                b.gestionnaire_id,
                b.statut,
                b.photos,
                b.video_url,
                b.plan_masse_url,
                b.nombre_etages,
                o.name as owner_name,
                o.first_name as owner_first_name,
                o.type as owner_type,
                g.nom as gestionnaire_name,
                COUNT(l.id) as nb_lots
             FROM buildings b
             LEFT JOIN lots l ON l.building_id = b.id
             LEFT JOIN owners o ON b.owner_id = o.id
             LEFT JOIN users g ON b.gestionnaire_id = g.id
             WHERE ${whereClause.replace(/owner_id/g, 'b.owner_id')}
             GROUP BY b.id, o.id, g.id
             ORDER BY b.created_at DESC
        `;
        
        const result = await pool.query(query);

        // Pour chaque immeuble, formater le résultat (Calcul occupation désactivé temporairement car table leases manquante)
        const immeublesAvecOccupation = result.rows.map((immeuble: any) => {
            const totalLots = parseInt(immeuble.nb_lots);
            
            // Placeholder: Occupation hardcodée à 0 le temps d'implémenter les baux
            const lotsOccupes = 0; 
            const occupation = 0;

            // Formater le nom du propriétaire
            const ownerLabel = immeuble.owner_type === 'individual' 
                ? `${immeuble.owner_name} ${immeuble.owner_first_name || ''}`.trim()
                : immeuble.owner_name;

            return {
                ...immeuble,
                nbLots: totalLots,
                occupation,
                statut: totalLots === 0 ? 'Vide' : 'Disponible',
                proprietaire: ownerLabel
            };
        });

        res.status(200).json({ immeubles: immeublesAvecOccupation });
    } catch (error) {
        console.error('Erreur récupération immeubles:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des immeubles.' });
    }
});

// GET /api/biens/lots : Récupérer la liste des lots (filtrés par accès propriétaire)
router.get('/lots', permissions.canRead('biens'), filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    const ownerIds = (req as any).ownerIds;
    const whereClause = buildOwnerWhereClause(ownerIds);

    try {
        const query = `
            SELECT 
                l.id,
                l.ref_lot as reference,
                l.type,
                l.building_id,
                b.nom as immeuble,
                b.owner_id,
                o.name as owner_name,
                l.etage,
                l.bloc,
                l.surface as superficie,
                l.nb_pieces as nbPieces,
                l.loyer_mensuel as loyer,
                l.charges_mensuelles as charges,
                l.periodicite,
                l.caution,
                l.avance,
                l.prix_vente,
                l.modalite_vente,
                l.duree_echelonnement,
                l.photos,
                l.statut,
                l.date_disponibilite,
                l.description
             FROM lots l
             JOIN buildings b ON l.building_id = b.id
             LEFT JOIN owners o ON b.owner_id = o.id
             WHERE ${whereClause.replace(/owner_id/g, 'b.owner_id')}
             ORDER BY l.created_at DESC
        `;

        const result = await pool.query(query);

        const lots = result.rows.map(lot => ({
            ...lot,
            superficie: parseFloat(lot.superficie) || 0,
            loyer: parseFloat(lot.loyer) || 0,
            charges: parseFloat(lot.charges) || 0,
            caution: parseFloat(lot.caution) || 0,
            prix_vente: lot.prix_vente ? parseFloat(lot.prix_vente) : null,
            nbPieces: parseInt(lot.nbpieces || lot.nbPieces) || 0,
            avance: parseInt(lot.avance) || 1,
            photos: lot.photos || []
        }));

        res.status(200).json({ lots });
    } catch (error) {
        console.error('Erreur récupération lots:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des lots.' });
    }
});

// POST /api/biens/immeubles : Créer ou mettre à jour un immeuble
router.post('/immeubles', permissions.canWrite('biens'), async (req: AuthenticatedRequest, res: Response) => {

    const { 
        id, nom, type, adresse, ville, pays, description, owner_id,
        // Nouveaux champs
        latitude, longitude, quartier, gestionnaire_id, statut,
        photos, video_url, plan_masse_url, nombre_etages
    } = req.body;

    if (!owner_id) {
        return res.status(400).json({ message: 'Propriétaire (owner_id) est requis.' });
    }

    try {
        // En mode multi-propriétaire, il faut vérifier que le User a accès à cet Owner
        // Sauf si c'est un admin ou gestionnaire/manager global
        if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
             const accessCheck = await pool.query(
                `SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
                [owner_id, req.userId]
             );
             if (accessCheck.rows.length === 0) {
                 return res.status(403).json({ message: 'Vous n\'avez pas accès à ce propriétaire.' });
             }
        }

        if (id) {
            // Mise à jour
            const result = await pool.query(
                `UPDATE buildings 
                 SET nom = $1, type = $2, adresse = $3, ville = $4, pays = $5, description = $6, owner_id = $7,
                     latitude = $8, longitude = $9, quartier = $10, gestionnaire_id = $11, statut = $12,
                     photos = $13, video_url = $14, plan_masse_url = $15, nombre_etages = $16,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $17
                 RETURNING *`,
                [nom, type, adresse, ville, pays, description, owner_id,
                 latitude || null, longitude || null, quartier || null, gestionnaire_id || null, statut || 'actif',
                 photos ? JSON.stringify(photos) : '[]', video_url || null, plan_masse_url || null, nombre_etages || 1,
                 id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble non trouvé.' });
            }
            res.status(200).json(result.rows[0]);
        } else {
            // Création
            const result = await pool.query(
                `INSERT INTO buildings (owner_id, nom, type, adresse, ville, pays, description,
                                        latitude, longitude, quartier, gestionnaire_id, statut,
                                        photos, video_url, plan_masse_url, nombre_etages) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
                 RETURNING *`,
                [owner_id, nom, type, adresse, ville, pays, description,
                 latitude || null, longitude || null, quartier || null, gestionnaire_id || null, statut || 'actif',
                 photos ? JSON.stringify(photos) : '[]', video_url || null, plan_masse_url || null, nombre_etages || 1]
            );
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error('Erreur sauvegarde immeuble:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde.' });
    }
});

// POST /api/biens/lots : Créer ou mettre à jour un lot
router.post('/lots', permissions.canWrite('biens'), async (req: AuthenticatedRequest, res: Response) => {

    const { 
        id, 
        immeuble, // Nom de l'immeuble - legacy, préférer building_id
        building_id, // Identifiant direct préféré
        reference, 
        type, 
        etage,
        bloc,
        superficie, 
        nbPieces, 
        loyer, 
        charges,
        // Nouveaux champs données locatives
        periodicite,
        caution,
        avance,
        // Données de vente
        prix_vente,
        modalite_vente,
        duree_echelonnement,
        // Médias et statut
        photos,
        statut,
        date_disponibilite,
        description 
    } = req.body;

    // Support both ID or Name for legacy compatibility, but prefer ID
    let targetBuildingId = building_id;

    try {
        if (!targetBuildingId && immeuble) {
            // Find building by name (Warning: names might not be unique globally, risky)
            // Better to enforce ID from frontend. For now, try to find one permissible.
             const buildingRes = await pool.query(
                `SELECT id, owner_id FROM buildings WHERE nom = $1 LIMIT 1`,
                [immeuble]
            );
            if (buildingRes.rows.length > 0) {
                targetBuildingId = buildingRes.rows[0].id;
            }
        }

        if (!targetBuildingId) {
             return res.status(400).json({ message: 'Immeuble invalide ou non spécifié.' });
        }

        // Verify Access to this Building's Owner
        // 1. Get Owner ID of the building
        const buildingOwnerRes = await pool.query('SELECT owner_id FROM buildings WHERE id = $1', [targetBuildingId]);
        if (buildingOwnerRes.rows.length === 0) {
            return res.status(404).json({ message: 'Immeuble introuvable.' });
        }
        const ownerId = buildingOwnerRes.rows[0].owner_id;

        // 2. Check User Access to Owner
        if (req.userRole !== 'admin') {
             const accessCheck = await pool.query(
                `SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
                [ownerId, req.userId]
             );
             if (accessCheck.rows.length === 0) {
                 return res.status(403).json({ message: 'Vous n\'avez pas droit d\'accès à l\'immeuble de ce propriétaire.' });
             }
        }

        // Proceed to Update/Insert
        if (id) {
            const result = await pool.query(
                `UPDATE lots 
                 SET ref_lot = $1, type = $2, etage = $3, bloc = $4, surface = $5, nb_pieces = $6, 
                     loyer_mensuel = $7, charges_mensuelles = $8, 
                     periodicite = $9, caution = $10, avance = $11,
                     prix_vente = $12, modalite_vente = $13, duree_echelonnement = $14,
                     photos = $15, statut = $16, date_disponibilite = $17,
                     description = $18, building_id = $19,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $20
                 RETURNING *`,
                [reference, type, etage, bloc || null, superficie, nbPieces, 
                 loyer, charges, 
                 periodicite || 'mensuel', caution || 0, avance || 1,
                 prix_vente || null, modalite_vente || null, duree_echelonnement || null,
                 photos ? JSON.stringify(photos) : '[]', statut || 'libre', date_disponibilite || null,
                 description, targetBuildingId, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Lot non trouvé.' });
            }
            res.status(200).json(result.rows[0]);
        } else {
             const result = await pool.query(
                `INSERT INTO lots (
                    building_id, ref_lot, type, etage, bloc, surface, nb_pieces, 
                    loyer_mensuel, charges_mensuelles,
                    periodicite, caution, avance,
                    prix_vente, modalite_vente, duree_echelonnement,
                    photos, statut, date_disponibilite, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
                 RETURNING *`,
                [targetBuildingId, reference, type, etage, bloc || null, superficie, nbPieces, 
                 loyer, charges, 
                 periodicite || 'mensuel', caution || 0, avance || 1,
                 prix_vente || null, modalite_vente || null, duree_echelonnement || null,
                 photos ? JSON.stringify(photos) : '[]', statut || 'libre', date_disponibilite || null, description]
            );
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Erreur sauvegarde lot:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde du lot.' });
    }
});

// DELETE /api/biens/immeubles/:id
router.delete('/immeubles/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const immeubleId = parseInt(req.params.id || '0', 10);

    try {
        // Check Owner Access first
        const buildingRes = await pool.query('SELECT owner_id FROM buildings WHERE id = $1', [immeubleId]);
        if (buildingRes.rows.length === 0) return res.status(404).json({ message: 'Immeuble introuvable.' });
        
        const ownerId = buildingRes.rows[0].owner_id;

        if (req.userRole !== 'admin') {
            const accessCheck = await pool.query(
                `SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
                [ownerId, req.userId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ message: 'Accès refusé.' });
            }
        }

        await pool.query('DELETE FROM buildings WHERE id = $1', [immeubleId]);
        res.status(200).json({ message: 'Immeuble supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur suppression immeuble:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// DELETE /api/biens/lots/:id
router.delete('/lots/:id', async (req: AuthenticatedRequest, res: Response) => {
     if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const lotId = parseInt(req.params.id || '0', 10);

    try {
        const lotRes = await pool.query(
            `SELECT b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1`, 
            [lotId]
        );
        if (lotRes.rows.length === 0) return res.status(404).json({ message: 'Lot introuvable.' });

         if (req.userRole !== 'admin') {
             const accessCheck = await pool.query(
                `SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE`,
                [lotRes.rows[0].owner_id, req.userId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ message: 'Accès refusé.' });
            }
        }

        await pool.query('DELETE FROM lots WHERE id = $1', [lotId]);
        res.status(200).json({ message: 'Lot supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur suppression lot:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;