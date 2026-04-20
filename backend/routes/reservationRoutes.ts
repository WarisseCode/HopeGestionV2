// backend/routes/reservationRoutes.ts
import { Router, Request, Response } from 'express';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans les routes protégées.
// Les routes publiques peuvent l'utiliser sous exception, sinon req.dbClient garanti l'isolation RLS.
import pool from '../db/database';
import * as dotenv from 'dotenv';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
// [RLS] filterByOwner et buildOwnerWhereClause supprimés.
// Isolation garantie par PostgreSQL Row-Level Security via tenantGuard.
import { tenantGuard } from '../middleware/tenantGuard';

dotenv.config();

const router = Router();

// --- PUBLIC ROUTES (No Auth) ---

// [PUBLIC] Route visiteur sans authentification.
// tenantGuard non applicable : aucun JWT disponible.
// owner_id déduit depuis building_id ou lot_id via DB.
// Jamais fourni par le client externe.
// POST /api/reservations/public - Créer une demande de réservation (Visiteur)
router.post('/public', async (req: Request, res: Response) => {
    try {
        const { 
            lot_id, 
            nom, 
            prenoms, 
            email, 
            telephone, 
            date_debut, 
            message,
            type_projet // 'location' or 'achat'
        } = req.body;

        if (!lot_id || !nom || !telephone) {
            return res.status(400).json({ message: 'Champs obligatoires manquants (Lot, Nom, Téléphone)' });
        }

        // 1. Get Lot or Building & Owner Info
        const lotIdStr = String(lot_id);
        const isBuilding = lotIdStr.startsWith('b-');
        const dbId = isBuilding ? parseInt(lotIdStr.replace('b-', '')) : parseInt(lotIdStr);
        
        let deducedOwnerId = null;
        let loyer = 0;
        let descriptionReservation = `Réservation Web - Projet: ${type_projet}. Message: ${message || ''}`;
        let actualLotId = null;

        if (isBuilding) {
            const buildResult = await pool.query('SELECT nom, owner_id FROM buildings WHERE id = $1', [dbId]);
            if (buildResult.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble introuvable' });
            }
            deducedOwnerId = buildResult.rows[0].owner_id;
            descriptionReservation = `Immeuble: ${buildResult.rows[0].nom}. ` + descriptionReservation;
            // actualLotId reste null
        } else {
            const lotResult = await pool.query(
                'SELECT l.loyer_mensuel, b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1',
                [dbId]
            );
            if (lotResult.rows.length === 0) {
                return res.status(404).json({ message: 'Lot introuvable' });
            }
            deducedOwnerId = lotResult.rows[0].owner_id;
            loyer = lotResult.rows[0].loyer_mensuel || 0;
            actualLotId = dbId;
        }

        // 2. Check if Tenant exists (by phone) or Create Prospect
        let tenantId;
        const tenantCheck = await pool.query('SELECT id FROM tenants WHERE telephone_principal = $1', [telephone]);
        
        if (tenantCheck.rows.length > 0) {
            tenantId = tenantCheck.rows[0].id;
        } else {
            const newTenant = await pool.query(`
                INSERT INTO tenants (
                    nom, prenoms, email, telephone_principal, owner_id
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [nom, prenoms || '', email || null, telephone, deducedOwnerId]);
            tenantId = newTenant.rows[0].id;
        }

        // 3. Create Reservation (Lease with type 'reservation')
        const refResult = await pool.query("SELECT COUNT(*) FROM leases WHERE type_contrat = 'reservation'");
        const count = parseInt(refResult.rows[0].count) + 1;
        const reference = `RES-WEB-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

        const montantDepot = Math.round(loyer * 0.05);

        const leaseResult = await pool.query(`
            INSERT INTO leases (
                tenant_id, lot_id, owner_id, reference_bail, type_contrat,
                date_debut, statut, conditions_particulieres, loyer_actuel,
                montant_depot, created_at, gestionnaire_id
            ) VALUES ($1, $2, $3, $4, 'reservation', $5, 'en_attente', $6, $7, $8, NOW(), NULL)
            RETURNING id, reference_bail
        `, [
            tenantId,
            actualLotId,
            deducedOwnerId,
            reference,
            date_debut || new Date(),
            descriptionReservation,
            loyer,
            montantDepot
        ]);

        res.status(201).json({ 
            message: 'Demande de réservation enregistrée', 
            reference: leaseResult.rows[0].reference_bail 
        });

    } catch (error) {
        console.error('Error creating public reservation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// --- PROTECTED ROUTES (Manager/Owner) ---
router.use(protect);

// GET /api/reservations - List all reservations (filtered by owner via RLS)
router.get('/', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        
        // [RLS] Filtrage automatique par tenant
        const result = await dbClient.query(`
            SELECT l.id, l.reference_bail, l.statut, l.date_debut, l.created_at,
                   l.conditions_particulieres, l.loyer_actuel, l.montant_depot,
                   t.nom as locataire_nom, t.prenoms as locataire_prenoms, t.telephone_principal,
                   COALESCE(lot.ref_lot, 'Immeuble Complet') as ref_lot,
                   COALESCE(b.nom, 'Non assigné') as immeuble_nom
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lot ON l.lot_id = lot.id
            LEFT JOIN buildings b ON lot.building_id = b.id
            WHERE l.type_contrat = 'reservation'
            ORDER BY l.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/reservations/:id/validate - Validate or refuse a reservation (with owner check via RLS)
router.post('/:id/validate', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { statut, commentaire } = req.body;
        
        if (!['actif', 'refuse'].includes(statut)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        // [RLS] Filtrage automatique par tenant
        // Update reservation status and return lot_id
        const checkResult = await dbClient.query(
            "UPDATE leases SET statut = $1, updated_at = NOW() WHERE id = $2 AND type_contrat = 'reservation' RETURNING lot_id",
            [statut, id]
        );
        
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée ou accès refusé' });
        }

        // If accepted, update lot status to 'reserve' (only if a specific lot is attached)
        if (statut === 'actif') {
            const lot_id = checkResult.rows[0].lot_id;
            if (lot_id) {
                // Update est filtré par RLS si lots a bien RLS, garantissant de ne pas toucher d'autres lots
                await dbClient.query('UPDATE lots SET statut = $1 WHERE id = $2', ['reserve', lot_id]);
            }
        }

        res.json({ message: 'Réservation mise à jour' });
    } catch (error) {
        console.error('Error validating reservation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/reservations/:id/transform - Transform validated reservation into lease
router.post('/:id/transform', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const { 
            date_fin, 
            caution, 
            avance,
            periodicite = 'mensuel'
        } = req.body;

        await dbClient.query('BEGIN');
        
        // 1. Get the reservation
        // [RLS] Filtrage automatique par tenant
        const reservationResult = await dbClient.query(`
            SELECT l.*, 
                   COALESCE(lot.loyer_mensuel, l.loyer_actuel) as loyer_mensuel, 
                   COALESCE(lot.building_id, l.lot_id) as building_id
            FROM leases l
            LEFT JOIN lots lot ON l.lot_id = lot.id
            WHERE l.id = $1 AND l.type_contrat = 'reservation' AND l.statut = 'actif'
        `, [id]);

        if (reservationResult.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Réservation non trouvée, non validée ou accès refusé' });
        }

        const reservation = reservationResult.rows[0];

        // 2. Generate new lease reference
        const refResult = await dbClient.query("SELECT COUNT(*) FROM leases WHERE type_contrat = 'location'");
        const count = parseInt(refResult.rows[0].count) + 1;
        const newReference = `BAIL-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

        // 3. Update the lease: change type_contrat to 'location' and update fields
        const transformResult = await dbClient.query(`
            UPDATE leases SET 
                type_contrat = 'location',
                reference_bail = $1,
                date_fin = $2,
                caution = $3,
                avance = $4,
                loyer_actuel = $5,
                statut = 'actif',
                conditions_particulieres = CONCAT(conditions_particulieres, E'\n[Transformé depuis réservation le ', NOW()::date, ']'),
                updated_at = NOW()
            WHERE id = $6 RETURNING id
        `, [
            newReference,
            date_fin || null,
            caution || reservation.loyer_mensuel || 0,
            avance || 1,
            reservation.loyer_mensuel || reservation.loyer_actuel || 0,
            id
        ]);
        
        if (transformResult.rowCount === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Erreur transformation, accès refusé lors de la mise à jour.' });
        }

        // 4. Update lot status to 'occupe' (if it is a lot)
        if (reservation.lot_id) {
            await dbClient.query('UPDATE lots SET statut = $1 WHERE id = $2', ['occupe', reservation.lot_id]);
        }

        await dbClient.query('COMMIT');
        res.json({ 
            message: 'Réservation transformée en bail avec succès',
            reference: newReference 
        });
    } catch (error: any) {
        await dbClient.query('ROLLBACK');
        console.error('Error transforming reservation:', error);
        res.status(500).json({ message: `Erreur interne: ${error.message}` });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — reservationRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Exception Publique documentée : La création par un visiteur de POST /public ignore tenantGuard (sans JWT), son owner_id est inféré via table lots ou buildings nativement.
 * ✅ ownerIsolation intégralement SUPPRIMÉ ("filterByOwner" & "buildOwnerWhereClause" out).
 * ✅ Routes gestionnaires assignées strictement avec tenantGuard (enchaînement avec req.dbClient).
 * ✅ Tous les appels de pool.query() remplacés par req.dbClient.query() sur l'espace d'administration.
 * ✅ L'opération de transformation 'POST /:id/transform' est maintenant englobée par un tunnel transactionnel (BEGIN/COMMIT/ROLLBACK) très strict pour la synchronisation bail et lots.
 * ✅ Déclenchement systémique d'erreur 404 là où blockages RLS peuvent survenir.
 * ═══════════════════════════════════════════════════
 */

export default router;
