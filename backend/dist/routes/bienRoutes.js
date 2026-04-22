"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/bienRoutes.ts
const express_1 = require("express");
const dotenv = __importStar(require("dotenv"));
const subscriptionLimits_1 = require("../middleware/subscriptionLimits");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
dotenv.config();
const router = (0, express_1.Router)();
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
// GET /api/biens/immeubles : Récupérer la liste des immeubles
// [PATTERN RLS] - Remplacement de filterByOwner par tenantGuard
router.get('/immeubles', permissionMiddleware_1.default.canRead('biens'), tenantGuard_1.tenantGuard, async (req, res) => {
    // [PATTERN RLS] - Récupération du client DB isolé de la session
    const dbClient = req.dbClient;
    try {
        const validOwnerIds = req.validOwnerIds || [];
        const isAdmin = req.userRole === 'admin';
        let ownerFilter = '';
        if (!isAdmin && validOwnerIds.length > 0) {
            ownerFilter = `WHERE b.owner_id IN (${validOwnerIds.join(',')})`;
        }
        else if (!isAdmin) {
            ownerFilter = 'WHERE 1=0';
        }
        const query = `
            SELECT
                b.id, b.nom, b.type, b.adresse, b.ville, b.pays, b.description,
                b.photo_url as photo, b.owner_id, b.latitude, b.longitude,
                b.quartier, b.gestionnaire_id, b.statut, b.photos, b.video_url,
                b.plan_masse_url, b.nombre_etages, b.total_lots,
                o.name as owner_name, o.first_name as owner_first_name, o.type as owner_type,
                g.nom as gestionnaire_name,
                COUNT(l.id) as nb_lots,
                COUNT(CASE WHEN l.statut = 'occupe' THEN 1 END) as lots_occupes
             FROM buildings b
             LEFT JOIN lots l ON l.building_id = b.id
             LEFT JOIN owners o ON b.owner_id = o.id
             LEFT JOIN users g ON b.gestionnaire_id = g.id
             ${ownerFilter}
             GROUP BY b.id, o.id, g.id
             ORDER BY b.created_at DESC
        `;
        const result = await dbClient.query(query);
        const immeublesAvecOccupation = result.rows.map((immeuble) => {
            const totalLots = parseInt(immeuble.nb_lots) || 0;
            const lotsOccupes = parseInt(immeuble.lots_occupes) || 0;
            const occupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
            const ownerLabel = immeuble.owner_type === 'individual'
                ? `${immeuble.owner_name} ${immeuble.owner_first_name || ''}`.trim()
                : immeuble.owner_name;
            const statut = totalLots === 0 ? 'Vide'
                : lotsOccupes === totalLots ? 'Complet'
                    : lotsOccupes > 0 ? 'En location'
                        : 'Disponible';
            return {
                ...immeuble,
                nbLots: totalLots,
                lotsOccupes,
                occupation,
                statut,
                proprietaire: ownerLabel
            };
        });
        res.status(200).json({ immeubles: immeublesAvecOccupation });
    }
    catch (error) {
        console.error('Erreur récupération immeubles:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des immeubles.' });
    }
});
// GET /api/biens/lots : Récupérer la liste des lots
router.get('/lots', permissionMiddleware_1.default.canRead('biens'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    try {
        const validOwnerIds = req.validOwnerIds || [];
        const isAdmin = req.userRole === 'admin';
        let ownerFilter = '';
        if (!isAdmin && validOwnerIds.length > 0) {
            ownerFilter = `AND l.owner_id IN (${validOwnerIds.join(',')})`;
        }
        else if (!isAdmin) {
            ownerFilter = 'AND 1=0';
        }
        const query = `
            SELECT
                l.id, l.ref_lot as reference, l.type, l.building_id,
                b.nom as immeuble, b.owner_id, o.name as owner_name,
                l.etage, l.bloc, l.surface as superficie, l.nb_pieces as nbPieces,
                l.loyer_mensuel as loyer, l.charges_mensuelles as charges,
                l.periodicite, l.caution, l.avance, l.prix_vente, l.modalite_vente,
                l.duree_echelonnement, l.photos, l.statut, l.date_disponibilite, l.description
             FROM lots l
             JOIN buildings b ON l.building_id = b.id
             LEFT JOIN owners o ON b.owner_id = o.id
             WHERE 1=1 ${ownerFilter}
             ORDER BY l.created_at DESC
        `;
        const result = await dbClient.query(query);
        const lots = result.rows.map((lot) => ({
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
    }
    catch (error) {
        console.error('Erreur récupération lots:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des lots.' });
    }
});
// POST /api/biens/immeubles : Créer ou mettre à jour un immeuble
router.post('/immeubles', permissionMiddleware_1.default.canWrite('biens'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    // [PATTERN RLS] - Le vrai ownerId est récupéré de faĉon sécurisée via le Middleware !
    // Si l'utilisateur tente de fustiger req.body.owner_id, le RLS cassera lors de l'INSERT/UPDATE.
    const strictOwnerId = req.resolvedOwnerId;
    const { id, nom, type, adresse, ville, pays, description, latitude, longitude, quartier, gestionnaire_id, statut, photos, video_url, plan_masse_url, nombre_etages, total_lots, photo } = req.body;
    try {
        // [PATTERN RLS] - Plus de accessCheck Manuel avec owner_user ! 
        // Si l'utilisateur n'a pas les droits sur l'ID de l'immeuble, le RETURNING renvoie 0 lignes
        if (id) {
            // Mise à jour (le update ne procèdera que si l'immeuble cible est à lui grace à la Policy RLS)
            const result = await dbClient.query(`UPDATE buildings 
                 SET nom = $1, type = $2, adresse = $3, ville = $4, pays = $5, description = $6, owner_id = $7,
                     latitude = $8, longitude = $9, quartier = $10, gestionnaire_id = $11, statut = $12,
                     photos = $13, video_url = $14, plan_masse_url = $15, nombre_etages = $16,
                     photo_url = $17, total_lots = $18, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $19
                 RETURNING *`, [nom, type, adresse, ville, pays, description, strictOwnerId,
                latitude || null, longitude || null, quartier || null, gestionnaire_id || null, statut || 'actif',
                photos ? JSON.stringify(photos) : '[]', video_url || null, plan_masse_url || null, nombre_etages || 1,
                photo || null, total_lots || 0, id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble non trouvé ou accès non autorisé.' });
            }
            res.status(200).json(result.rows[0]);
        }
        else {
            // Création
            const result = await dbClient.query(`INSERT INTO buildings (owner_id, nom, type, adresse, ville, pays, description,
                                        latitude, longitude, quartier, gestionnaire_id, statut,
                                        photos, video_url, plan_masse_url, nombre_etages, photo_url, total_lots) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
                 RETURNING *`, [strictOwnerId, nom, type, adresse, ville, pays, description,
                latitude || null, longitude || null, quartier || null, gestionnaire_id || null, statut || 'actif',
                photos ? JSON.stringify(photos) : '[]', video_url || null, plan_masse_url || null, nombre_etages || 1,
                photo || null, total_lots || 0]);
            res.status(200).json(result.rows[0]);
        }
    }
    catch (error) {
        console.error('Erreur sauvegarde immeuble:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde.' });
    }
});
// POST /api/biens/lots : Créer ou mettre à jour un lot
router.post('/lots', permissionMiddleware_1.default.canWrite('biens'), subscriptionLimits_1.checkPropertyLimit, tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const strictOwnerId = req.resolvedOwnerId;
    const { id, immeuble, building_id, reference, type, etage, bloc, superficie, nbPieces, loyer, charges, periodicite, caution, avance, prix_vente, modalite_vente, duree_echelonnement, photos, statut, date_disponibilite, description } = req.body;
    let targetBuildingId = building_id;
    try {
        if (!targetBuildingId && immeuble) {
            // [PATTERN RLS] - RLS filtre naturellement les immeubles par owner. 
            // Il n'y a donc plus de risque que le nom récupère celui d'un autre proprio.
            const buildingRes = await dbClient.query(`SELECT id FROM buildings WHERE nom = $1 LIMIT 1`, [immeuble]);
            if (buildingRes.rows.length > 0) {
                targetBuildingId = buildingRes.rows[0].id;
            }
        }
        if (!targetBuildingId) {
            return res.status(400).json({ message: 'Immeuble invalide, introuvable ou non autorisé.' });
        }
        // [PATTERN RLS] - Plus de vérification croisée fastidieuse (accessCheck de cible d'immeuble),
        // Si PostgreSQL RLS est activé et limite l'accès aux buildings de ce locataire, 
        // l'affectation à cet immeuble ou mise à jour du lot sera sécurisée nativement.
        if (id) {
            const result = await dbClient.query(`UPDATE lots 
                 SET ref_lot = $1, type = $2, etage = $3, bloc = $4, surface = $5, nb_pieces = $6, 
                     loyer_mensuel = $7, charges_mensuelles = $8, periodicite = $9, caution = $10, avance = $11,
                     prix_vente = $12, modalite_vente = $13, duree_echelonnement = $14,
                     photos = $15, statut = $16, date_disponibilite = $17, description = $18, building_id = $19,
                     owner_id = $20, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $21
                 RETURNING *`, [reference, type, etage, bloc || null, superficie, nbPieces,
                loyer, charges, periodicite || 'mensuel', caution || 0, avance || 1,
                prix_vente || null, modalite_vente || null, duree_echelonnement || null,
                photos || [], statut || 'libre', date_disponibilite || null, description, targetBuildingId,
                strictOwnerId, id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Lot non trouvé ou non autorisé.' });
            }
            res.status(200).json(result.rows[0]);
        }
        else {
            const result = await dbClient.query(`INSERT INTO lots (
                    building_id, owner_id, ref_lot, type, etage, bloc, surface, nb_pieces, 
                    loyer_mensuel, charges_mensuelles, periodicite, caution, avance,
                    prix_vente, modalite_vente, duree_echelonnement,
                    photos, statut, date_disponibilite, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
                 RETURNING *`, [targetBuildingId, strictOwnerId, reference, type, etage, bloc || null, superficie, nbPieces,
                loyer, charges, periodicite || 'mensuel', caution || 0, avance || 1,
                prix_vente || null, modalite_vente || null, duree_echelonnement || null,
                photos || [], statut || 'libre', date_disponibilite || null, description]);
            res.status(200).json(result.rows[0]);
        }
    }
    catch (error) {
        console.error('Erreur sauvegarde lot:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde du lot.' });
    }
});
// DELETE /api/biens/immeubles/:id
router.delete('/immeubles/:id', permissionMiddleware_1.default.canWrite('biens'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const immeubleId = parseInt(req.params.id || '0', 10);
    try {
        // [PATTERN RLS] - Simple suppression : la base bloquera ou simulera "0 rows affected"
        // pour ceux essayants de supprimer l'ID de qqn d'autre !
        const result = await dbClient.query('DELETE FROM buildings WHERE id = $1 RETURNING id', [immeubleId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Immeuble introuvable ou accès refusé.' });
        }
        res.status(200).json({ message: 'Immeuble supprimé avec succès.' });
    }
    catch (error) {
        console.error('Erreur suppression immeuble:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// DELETE /api/biens/lots/:id
router.delete('/lots/:id', permissionMiddleware_1.default.canWrite('biens'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const lotId = parseInt(req.params.id || '0', 10);
    try {
        // [PATTERN RLS] - Idem: On délègue tout à PostgreSQL sans risque d'IDOR
        const result = await dbClient.query('DELETE FROM lots WHERE id = $1 RETURNING id', [lotId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Lot introuvable ou accès refusé.' });
        }
        res.status(200).json({ message: 'Lot supprimé avec succès.' });
    }
    catch (error) {
        console.error('Erreur suppression lot:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
