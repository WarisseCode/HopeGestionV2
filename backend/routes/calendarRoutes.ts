import express, { Response } from 'express';
import { body, param } from 'express-validator';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addMonths, startOfMonth, setDate, isAfter, isBefore, parseISO, max, min } from 'date-fns';

const router = express.Router();

const eventCreateRules = [
    body('title').notEmpty().withMessage('Le titre est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('Titre trop long'),
    body('start_date').notEmpty().withMessage('La date de début est obligatoire').bail().isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Date de fin invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Description trop longue'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('is_all_day').optional({ nullable: true }).isBoolean().withMessage('is_all_day doit être un booléen'),
];
const eventIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];
const reminderSettingsRules = [
    body('event_type').notEmpty().withMessage('event_type est obligatoire').bail().isString().isLength({ max: 50 }).withMessage('event_type invalide'),
    body('delay_days').optional({ nullable: true }).isInt({ min: 0 }).withMessage('delay_days invalide'),
    body('channel').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Canal invalide'),
    body('active').optional({ nullable: true }).isBoolean().withMessage('active doit être un booléen'),
];

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
        const userId = req.userId;
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
                const dueDay = lease.jour_echeance || 5; 
                // Gérer les jours > nb jours dans le mois (ex: 31 février)
                // setDate gère ça (31 fev -> 2 ou 3 mars), mais pour un loyer on veut fin de mois.
                // Simplification: on laisse date-fns gérer ou on ne gère pas edge-case complexe.
                
                const rentDate = setDate(currentMonth, dueDay);

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

        // 3. Récupérer les ÉVÉNEMENTS PERSONNALISÉS
        const customEventsResult = await pool.query(
            `SELECT * FROM calendar_events 
             WHERE user_id = $1 
             AND (start_date BETWEEN $2 AND $3)`,
            [userId, start, end]
        );

        for (const evt of customEventsResult.rows) {
            events.push({
                id: `evt_${evt.id}`,
                title: evt.title,
                date: evt.start_date,
                type: 'custom', // ou evt.type
                details: {
                    description: evt.description
                }
            });
        }

        res.json({ events });

    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});



// POST /api/calendar/events
router.post('/events', protect, validate(eventCreateRules), async (req: any, res: Response) => {
    try {
        const { title, description, start_date, end_date, type, is_all_day } = req.body;
        const result = await pool.query(
            `INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type, is_all_day)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.userId, title, description, start_date, end_date, type, is_all_day || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création événement' });
    }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', protect, validate(eventIdParam), async (req: any, res: Response) => {
    try {
        await pool.query('DELETE FROM calendar_events WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
        res.json({ message: 'Événement supprimé' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

// GET /api/calendar/settings
router.get('/settings', protect, async (req: any, res) => {
    try {
        const result = await pool.query('SELECT * FROM reminder_settings WHERE user_id = $1', [req.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erreur chargement réglages' });
    }
});

// POST /api/calendar/settings
router.post('/settings', protect, validate(reminderSettingsRules), async (req: any, res: Response) => {
    try {
        const { event_type, delay_days, channel, active } = req.body;
        // Check if exists
        const existing = await pool.query(
            'SELECT * FROM reminder_settings WHERE user_id = $1 AND event_type = $2',
            [req.userId, event_type]
        );

        if (existing.rows.length > 0) {
            const result = await pool.query(
                'UPDATE reminder_settings SET delay_days = $1, channel = $2, active = $3 WHERE user_id = $4 AND event_type = $5 RETURNING *',
                [delay_days, channel, active, req.userId, event_type]
            );
            res.json(result.rows[0]);
        } else {
            const result = await pool.query(
                'INSERT INTO reminder_settings (user_id, event_type, delay_days, channel, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [req.userId, event_type, delay_days, channel, active]
            );
            res.json(result.rows[0]);
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur sauvegarde réglages' });
    }
});

export default router;
