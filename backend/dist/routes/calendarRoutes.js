"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const date_fns_1 = require("date-fns");
const router = express_1.default.Router();
/**
 * Helper: Récupérer l'ID propriétaire géré
 */
const getManagedOwnerId = async (userId) => {
    const result = await database_1.default.query(`SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`, [userId]);
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};
// GET /api/calendar
// Query: start (YYYY-MM-DD), end (YYYY-MM-DD)
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);
        if (!ownerId)
            return res.status(200).json({ events: [] });
        const { start, end } = req.query;
        if (!start || !end)
            return res.status(400).json({ message: "Dates de début et fin requises" });
        const startDate = (0, date_fns_1.parseISO)(start);
        const endDate = (0, date_fns_1.parseISO)(end);
        const events = [];
        // 1. Récupérer les INTERVENTIONS (Tickets)
        const ticketsResult = await database_1.default.query(`SELECT t.id, t.titre, t.scheduled_date, t.date_creation, t.priorite,
                    l.ref_lot, b.nom as building_name
             FROM tickets t
             LEFT JOIN lots l ON t.lot_id = l.id
             LEFT JOIN buildings b ON l.building_id = b.id
             WHERE b.owner_id = $1 
             AND (t.scheduled_date BETWEEN $2 AND $3 OR t.date_creation BETWEEN $2 AND $3)`, [ownerId, start, end]);
        for (const ticket of ticketsResult.rows) {
            events.push({
                id: `ticket_${ticket.id}`,
                title: `Intervention: ${ticket.titre}`,
                date: ticket.scheduled_date || ticket.date_creation,
                type: 'intervention',
                details: {
                    priority: ticket.priorite,
                    location: `${ticket.building_name} - ${ticket.ref_lot}`
                }
            });
        }
        // 2. Récupérer les BAUX (Loyers & Fin de bail)
        // On récupère les baux qui intersectent la période demandée
        const leasesResult = await database_1.default.query(`SELECT l.id, l.date_debut, l.date_fin, l.jour_echeance, l.loyer_actuel,
                    tn.nom as tenant_name, tn.prenoms as tenant_surname,
                    lot.ref_lot
             FROM leases l
             JOIN tenants tn ON l.tenant_id = tn.id
             JOIN lots lot ON l.lot_id = lot.id
             WHERE l.owner_id = $1
             AND l.statut = 'actif'`, [ownerId]);
        for (const lease of leasesResult.rows) {
            // A. Fin de contrat
            if (lease.date_fin) {
                const leaseEnd = new Date(lease.date_fin);
                if ((0, date_fns_1.isAfter)(leaseEnd, startDate) && (0, date_fns_1.isBefore)(leaseEnd, endDate)) {
                    events.push({
                        id: `lease_end_${lease.id}`,
                        title: `Fin de bail: ${lease.tenant_name} ${lease.tenant_surname}`,
                        date: lease.date_fin,
                        type: 'contract',
                        details: {
                            lot: lease.ref_lot
                        }
                    });
                }
            }
            // B. Loyers (Récurrents)
            // On itère mois par mois entre startDate et endDate
            let currentMonth = (0, date_fns_1.startOfMonth)(startDate);
            const finalMonth = (0, date_fns_1.startOfMonth)(endDate);
            while ((0, date_fns_1.isBefore)(currentMonth, finalMonth) || currentMonth.getTime() === finalMonth.getTime()) {
                // Créer une date pour ce mois avec le jour d'échéance
                let dueDay = lease.jour_echeance || 5;
                // Gérer les jours > nb jours dans le mois (ex: 31 février)
                // setDate gère ça (31 fev -> 2 ou 3 mars), mais pour un loyer on veut fin de mois.
                // Simplification: on laisse date-fns gérer ou on ne gère pas edge-case complexe.
                let rentDate = (0, date_fns_1.setDate)(currentMonth, dueDay);
                // Vérifier si cette date de loyer est valide pour ce bail (après début, avant fin)
                const leaseStart = new Date(lease.date_debut);
                const leaseEnd = lease.date_fin ? new Date(lease.date_fin) : null;
                if ((0, date_fns_1.isAfter)(rentDate, leaseStart) && (!leaseEnd || (0, date_fns_1.isBefore)(rentDate, leaseEnd))) {
                    // Vérifier si dans la fenêtre de vue
                    if (((0, date_fns_1.isAfter)(rentDate, startDate) || rentDate.getTime() === startDate.getTime()) &&
                        ((0, date_fns_1.isBefore)(rentDate, endDate) || rentDate.getTime() === endDate.getTime())) {
                        events.push({
                            id: `rent_${lease.id}_${rentDate.toISOString().split('T')[0]}`,
                            title: `Loyer: ${lease.tenant_name}`,
                            date: rentDate,
                            type: 'payment',
                            amount: lease.loyer_actuel,
                            details: {
                                lot: lease.ref_lot
                            }
                        });
                    }
                }
                currentMonth = (0, date_fns_1.addMonths)(currentMonth, 1);
            }
        }
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=calendarRoutes.js.map