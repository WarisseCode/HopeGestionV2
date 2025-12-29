import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { addMonths, startOfMonth, setDate, isAfter, isBefore, parseISO, max, min } from 'date-fns';

const router = express.Router();

/**
 * Helper: Récupérer l'ID propriétaire géré
 */
const getManagedOwnerId = async (userId: number): Promise<number | null> => {
    const result = await pool.query(
        `SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};

// GET /api/calendar
// Query: start (YYYY-MM-DD), end (YYYY-MM-DD)
router.get('/', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(200).json({ events: [] });

        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ message: "Dates de début et fin requises" });

        const startDate = parseISO(start as string);
        const endDate = parseISO(end as string);

        const events = [];

        // 1. Récupérer les INTERVENTIONS (Tickets)
        const ticketsResult = await pool.query(
            `SELECT t.id, t.titre, t.scheduled_date, t.date_creation, t.priorite,
                    l.ref_lot, b.nom as building_name
             FROM tickets t
             LEFT JOIN lots l ON t.lot_id = l.id
             LEFT JOIN buildings b ON l.building_id = b.id
             WHERE b.owner_id = $1 
             AND (t.scheduled_date BETWEEN $2 AND $3 OR t.date_creation BETWEEN $2 AND $3)`,
            [ownerId, start, end]
        );

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
        const leasesResult = await pool.query(
            `SELECT l.id, l.date_debut, l.date_fin, l.jour_echeance, l.loyer_actuel,
                    tn.nom as tenant_name, tn.prenoms as tenant_surname,
                    lot.ref_lot
             FROM leases l
             JOIN tenants tn ON l.tenant_id = tn.id
             JOIN lots lot ON l.lot_id = lot.id
             WHERE l.owner_id = $1
             AND l.statut = 'actif'`,
            [ownerId]
        );

        for (const lease of leasesResult.rows) {
            // A. Fin de contrat
            if (lease.date_fin) {
                const leaseEnd = new Date(lease.date_fin);
                if (isAfter(leaseEnd, startDate) && isBefore(leaseEnd, endDate)) {
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
            let currentMonth = startOfMonth(startDate);
            const finalMonth = startOfMonth(endDate);

            while (isBefore(currentMonth, finalMonth) || currentMonth.getTime() === finalMonth.getTime()) {
                // Créer une date pour ce mois avec le jour d'échéance
                let dueDay = lease.jour_echeance || 5; 
                // Gérer les jours > nb jours dans le mois (ex: 31 février)
                // setDate gère ça (31 fev -> 2 ou 3 mars), mais pour un loyer on veut fin de mois.
                // Simplification: on laisse date-fns gérer ou on ne gère pas edge-case complexe.
                
                let rentDate = setDate(currentMonth, dueDay);

                // Vérifier si cette date de loyer est valide pour ce bail (après début, avant fin)
                const leaseStart = new Date(lease.date_debut);
                const leaseEnd = lease.date_fin ? new Date(lease.date_fin) : null;

                if (isAfter(rentDate, leaseStart) && (!leaseEnd || isBefore(rentDate, leaseEnd))) {
                    // Vérifier si dans la fenêtre de vue
                     if ((isAfter(rentDate, startDate) || rentDate.getTime() === startDate.getTime()) && 
                         (isBefore(rentDate, endDate) || rentDate.getTime() === endDate.getTime())) {
                        
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
                
                currentMonth = addMonths(currentMonth, 1);
            }
        }

        res.json({ events });

    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
