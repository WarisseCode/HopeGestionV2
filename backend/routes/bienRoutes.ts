// backend/routes/bienRoutes.ts
import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { filterByOwner, buildOwnerWhereClause } from '../middleware/ownerIsolation';

dotenv.config();

const router = Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

// GET /api/biens/immeubles : Récupérer la liste des immeubles (filtrés par accès propriétaire)
router.get('/immeubles', filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
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
                o.name as owner_name,
                o.first_name as owner_first_name,
                o.type as owner_type,
                COUNT(l.id) as nb_lots
             FROM buildings b
             LEFT JOIN lots l ON l.building_id = b.id
             LEFT JOIN owners o ON b.owner_id = o.id
             WHERE ${whereClause.replace(/owner_id/g, 'b.owner_id')}
             GROUP BY b.id, o.id
             ORDER BY b.created_at DESC
        `;
        
        const result = await pool.query(query);

        // Pour chaque immeuble, calculons le taux d'occupation
        const immeublesAvecOccupation = await Promise.all(result.rows.map(async (immeuble: any) => {
            // Récupérer le nombre de lots occupés
            const occupesResult = await pool.query(
                `SELECT COUNT(*) as occupes 
                 FROM lots l 
                 JOIN leases le ON le.lot_id = l.id 
                 WHERE l.building_id = $1 AND le.statut = 'actif'`,
                [immeuble.id]
            );
            const lotsOccupes = parseInt(occupesResult.rows[0].occupes);
            const totalLots = parseInt(immeuble.nb_lots);

            // Calculer le pourcentage d'occupation
            const occupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
            
            // Formater le nom du propriétaire
            const ownerLabel = immeuble.owner_type === 'individual' 
                ? `${immeuble.owner_name} ${immeuble.owner_first_name || ''}`.trim()
                : immeuble.owner_name;

            return {
                ...immeuble,
                nbLots: totalLots,
                occupation,
                statut: occupation === 100 ? 'Complet' : occupation === 0 ? 'Vacant' : 'Disponible',
                proprietaire: ownerLabel
            };
        }));

        res.status(200).json({ immeubles: immeublesAvecOccupation });
    } catch (error) {
        console.error('Erreur récupération immeubles:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des immeubles.' });
    }
});

// GET /api/biens/lots : Récupérer la liste des lots (filtrés par accès propriétaire)
router.get('/lots', filterByOwner, async (req: AuthenticatedRequest, res: Response) => {
    const ownerIds = (req as any).ownerIds;
    const whereClause = buildOwnerWhereClause(ownerIds);

    try {
        const query = `
            SELECT 
                l.id,
                l.ref_lot as reference,
                l.type,
                b.nom as immeuble,
                b.owner_id,
                o.name as owner_name,
                l.etage,
                l.surface as superficie,
                l.nb_pieces as nbPieces,
                l.loyer_mensuel as loyer,
                l.charges_mensuelles as charges,
                l.statut,
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
            superficie: parseFloat(lot.superficie),
            loyer: parseFloat(lot.loyer),
            charges: parseFloat(lot.charges),
            nbPieces: parseInt(lot.nbpieces || lot.nbPieces)
        }));

        res.status(200).json({ lots });
    } catch (error) {
        console.error('Erreur récupération lots:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des lots.' });
    }
});

// POST /api/biens/immeubles : Créer ou mettre à jour un immeuble
router.post('/immeubles', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification de base du rôle
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const { id, nom, type, adresse, ville, pays, description, owner_id } = req.body;

    if (!owner_id) {
        return res.status(400).json({ message: 'Propriétaire (owner_id) est requis.' });
    }

    try {
        // En mode multi-propriétaire, il faut vérifier que le User a accès à cet Owner
        // Sauf si c'est un admin
        if (req.userRole !== 'admin') {
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
                 SET nom = $1, type = $2, adresse = $3, ville = $4, pays = $5, description = $6, owner_id = $7
                 WHERE id = $8
                 RETURNING *`,
                [nom, type, adresse, ville, pays, description, owner_id, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble non trouvé.' });
            }
            res.status(200).json(result.rows[0]);
        } else {
            // Création
            const result = await pool.query(
                `INSERT INTO buildings (owner_id, nom, type, adresse, ville, pays, description) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING *`,
                [owner_id, nom, type, adresse, ville, pays, description]
            );
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error('Erreur sauvegarde immeuble:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde.' });
    }
});

// POST /api/biens/lots : Créer ou mettre à jour un lot
router.post('/lots', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    const { 
        id, 
        immeuble, // Nom de l'immeuble ?? attention, préférable d'utiliser building_id
        building_id, // Identifiant direct préfér
        reference, 
        type, 
        etage, 
        superficie, 
        nbPieces, 
        loyer, 
        charges, 
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
                // We should check access to this found building's owner
                // (Will be done below either way via standard check)
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
                 SET ref_lot = $1, type = $2, etage = $3, surface = $4, nb_pieces = $5, 
                     loyer_mensuel = $6, charges_mensuelles = $7, description = $8, building_id = $9
                 WHERE id = $10
                 RETURNING *`,
                [reference, type, etage, superficie, nbPieces, loyer, charges, description, targetBuildingId, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Lot non trouvé.' });
            }
            res.status(200).json(result.rows[0]);
        } else {
             const result = await pool.query(
                `INSERT INTO lots (building_id, ref_lot, type, etage, surface, nb_pieces, loyer_mensuel, charges_mensuelles, description) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 RETURNING *`,
                [targetBuildingId, reference, type, etage, superficie, nbPieces, loyer, charges, description]
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