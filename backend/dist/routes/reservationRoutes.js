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
// backend/routes/reservationRoutes.ts
const express_1 = require("express");
const dotenv = __importStar(require("dotenv"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = __importDefault(require("../db/database"));
dotenv.config();
const router = (0, express_1.Router)();
// --- PUBLIC ROUTES (No Auth) ---
// POST /api/reservations/public - Créer une demande de réservation (Visiteur)
router.post('/public', async (req, res) => {
    try {
        const { lot_id, nom, prenoms, email, telephone, date_debut, message, type_projet // 'location' or 'achat'
         } = req.body;
        if (!lot_id || !nom || !telephone) {
            return res.status(400).json({ message: 'Champs obligatoires manquants (Lot, Nom, Téléphone)' });
        }
        // 1. Get Lot & Owner Info
        const lotResult = await database_1.default.query('SELECT l.*, b.id as building_id, b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1', [lot_id]);
        if (lotResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable' });
        }
        const lot = lotResult.rows[0];
        // 2. Check if Tenant exists (by phone) or Create Prospect
        let tenantId;
        const tenantCheck = await database_1.default.query('SELECT id FROM tenants WHERE telephone_principal = $1', [telephone]);
        if (tenantCheck.rows.length > 0) {
            tenantId = tenantCheck.rows[0].id;
        }
        else {
            // Create "Prospect" tenant with minimal required fields
            const newTenant = await database_1.default.query(`
                INSERT INTO tenants (
                    nom, prenoms, email, telephone_principal
                ) VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [nom, prenoms || '', email || null, telephone]);
            tenantId = newTenant.rows[0].id;
        }
        // 3. Create Reservation (Lease with type 'reservation')
        // We use a prefix RES-WEB-...
        const refResult = await database_1.default.query("SELECT COUNT(*) FROM leases WHERE type_contrat = 'reservation'");
        const count = parseInt(refResult.rows[0].count) + 1;
        const reference = `RES-WEB-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
        const leaseResult = await database_1.default.query(`
            INSERT INTO leases (
                tenant_id, lot_id, owner_id, reference_bail, type_contrat,
                date_debut, statut, conditions_particulieres, loyer_actuel,
                created_at, gestionnaire_id
            ) VALUES ($1, $2, $3, $4, 'reservation', $5, 'en_attente', $6, $7, NOW(), NULL)
            RETURNING id, reference_bail
        `, [
            tenantId,
            lot_id,
            lot.owner_id,
            reference,
            date_debut || new Date(),
            `Réservation Web - Projet: ${type_projet}. Message: ${message || ''}`,
            lot.loyer_mensuel || 0
        ]);
        // 4. Update Lot Status (Optional: maybe keep 'libre' until validation?)
        // Let's keep it 'libre' but maybe flagged? Or 'reserve_en_attente' if we added that status to enum?
        // For now, let's leave lot as is, relying on 'leases.statut = en_attente' to show it in backlog.
        res.status(201).json({
            message: 'Demande de réservation enregistrée',
            reference: leaseResult.rows[0].reference_bail
        });
    }
    catch (error) {
        console.error('Error creating public reservation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// --- PROTECTED ROUTES (Manager/Owner) ---
router.use(authMiddleware_1.protect);
// GET /api/reservations - List all reservations
router.get('/', async (req, res) => {
    try {
        const result = await database_1.default.query(`
            SELECT l.*, 
                   t.nom as locataire_nom, t.prenoms as locataire_prenoms, t.telephone_principal,
                   lot.ref_lot, b.nom as immeuble_nom
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lot ON l.lot_id = lot.id
            JOIN buildings b ON lot.building_id = b.id
            WHERE l.type_contrat = 'reservation'
            ORDER BY l.created_at DESC
        `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/reservations/:id/validate - Validate or refuse a reservation
router.post('/:id/validate', async (req, res) => {
    try {
        const { id } = req.params;
        const { statut, commentaire } = req.body;
        if (!['actif', 'refuse'].includes(statut)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }
        // Update reservation status
        await database_1.default.query('UPDATE leases SET statut = $1, updated_at = NOW() WHERE id = $2 AND type_contrat = $3', [statut, id, 'reservation']);
        // If accepted, update lot status to 'reserve'
        if (statut === 'actif') {
            const leaseResult = await database_1.default.query('SELECT lot_id FROM leases WHERE id = $1', [id]);
            if (leaseResult.rows.length > 0) {
                await database_1.default.query('UPDATE lots SET statut = $1 WHERE id = $2', ['reserve', leaseResult.rows[0].lot_id]);
            }
        }
        res.json({ message: 'Réservation mise à jour' });
    }
    catch (error) {
        console.error('Error validating reservation:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/reservations/:id/transform - Transform validated reservation into lease
router.post('/:id/transform', async (req, res) => {
    try {
        const { id } = req.params;
        const { date_fin, caution, avance, periodicite = 'mensuel' } = req.body;
        // 1. Get the reservation
        const reservationResult = await database_1.default.query(`
            SELECT l.*, lot.loyer_mensuel, lot.building_id
            FROM leases l
            JOIN lots lot ON l.lot_id = lot.id
            WHERE l.id = $1 AND l.type_contrat = 'reservation' AND l.statut = 'actif'
        `, [id]);
        if (reservationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Réservation non trouvée ou non validée' });
        }
        const reservation = reservationResult.rows[0];
        // 2. Generate new lease reference
        const refResult = await database_1.default.query("SELECT COUNT(*) FROM leases WHERE type_contrat = 'location'");
        const count = parseInt(refResult.rows[0].count) + 1;
        const newReference = `BAIL-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
        // 3. Update the lease: change type_contrat to 'location' and update fields
        await database_1.default.query(`
            UPDATE leases SET 
                type_contrat = 'location',
                reference_bail = $1,
                date_fin = $2,
                caution = $3,
                avance = $4,
                periodicite = $5,
                loyer_actuel = $6,
                statut = 'actif',
                conditions_particulieres = CONCAT(conditions_particulieres, E'\n[Transformé depuis réservation le ', NOW()::date, ']'),
                updated_at = NOW()
            WHERE id = $7
        `, [
            newReference,
            date_fin || null,
            caution || reservation.loyer_mensuel || 0,
            avance || 1,
            periodicite,
            reservation.loyer_mensuel || reservation.loyer_actuel || 0,
            id
        ]);
        // 4. Update lot status to 'occupe'
        await database_1.default.query('UPDATE lots SET statut = $1 WHERE id = $2', ['occupe', reservation.lot_id]);
        // 5. Optionally: create first payment schedule entry (échéancier)
        // This can be added later as a more complete feature
        res.json({
            message: 'Réservation transformée en bail avec succès',
            reference: newReference
        });
    }
    catch (error) {
        console.error('Error transforming reservation:', error);
        res.status(500).json({ message: 'Erreur lors de la transformation' });
    }
});
exports.default = router;
//# sourceMappingURL=reservationRoutes.js.map