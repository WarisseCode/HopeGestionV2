import { Router, Response } from 'express';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import pool from '../db/database';

const router = Router();

// Helper : récupère l'ownerId lié à l'utilisateur courant (si 'owner')
async function getOwnerIdForUser(userId: number): Promise<number | null> {
    const res = await pool.query(
        'SELECT o.id FROM owners o JOIN owner_user ou ON ou.owner_id = o.id WHERE ou.user_id = $1 LIMIT 1',
        [userId]
    );
    return res.rows.length > 0 ? res.rows[0].id : null;
}

// GET /api/alertes
router.get('/', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const userRole = req.userRole;

        // Alertes ignorées par cet utilisateur
        const dismissedRes = await pool.query(
            'SELECT alert_id FROM dismissed_alerts WHERE user_id = $1',
            [userId]
        );
        const dismissedIds = new Set(dismissedRes.rows.map((r: any) => r.alert_id));

        // Filtrage propriétaire si besoin
        const isOwner = userRole === 'owner' || userRole === 'proprietaire';
        let ownerFilter = '';
        let ownerParams: any[] = [];
        if (isOwner) {
            const ownerId = await getOwnerIdForUser(userId);
            if (ownerId) {
                ownerFilter = `AND lo.owner_id = $${ownerParams.length + 1}`;
                ownerParams.push(ownerId);
            }
        }

        const alerts: any[] = [];

        // 1. Loyers en retard
        const latePaymentsQuery = `
            SELECT l.id, lo.ref_lot, t.nom, t.prenoms, l.loyer_actuel, b.nom as building_name
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE l.statut = 'actif'
            AND NOT EXISTS (
                SELECT 1 FROM payments p
                WHERE p.lease_id = l.id
                AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            )
            AND EXTRACT(DAY FROM CURRENT_DATE) > (COALESCE(l.jour_echeance, 5) + 5)
            ${ownerFilter}
        `;
        const lateRes = await pool.query(latePaymentsQuery, ownerParams);
        lateRes.rows.forEach((row: any) => {
            const id = `late_${row.id}`;
            if (!dismissedIds.has(id)) {
                alerts.push({
                    id, reference: `RET-${row.id}`,
                    titre: 'Loyer en retard',
                    description: `Loyer de ${row.nom} ${row.prenoms} (${row.ref_lot} - ${row.building_name}) non payé.`,
                    destinataire: 'Gestionnaire', type: 'Paiement',
                    priorite: 'Haute', dateCreation: new Date().toISOString(),
                    statut: 'Active', link: '/dashboard/finances'
                });
            }
        });

        // 2. Fins de contrat proches (60 jours)
        const expiringQuery = `
            SELECT l.id, lo.ref_lot, l.date_fin, t.nom, t.prenoms
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lo ON l.lot_id = lo.id
            WHERE l.statut = 'actif'
            AND l.date_fin IS NOT NULL
            AND l.date_fin <= (CURRENT_DATE + INTERVAL '60 days')
            AND l.date_fin >= CURRENT_DATE
            ${ownerFilter}
        `;
        const expiringRes = await pool.query(expiringQuery, ownerParams);
        expiringRes.rows.forEach((row: any) => {
            const id = `exp_${row.id}`;
            const daysLeft = Math.ceil((new Date(row.date_fin).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            if (!dismissedIds.has(id)) {
                alerts.push({
                    id, reference: `FIN-${row.id}`,
                    titre: 'Fin de contrat proche',
                    description: `Bail de ${row.nom} ${row.prenoms} (${row.ref_lot}) expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`,
                    destinataire: 'Gestionnaire', type: 'Contrat',
                    priorite: daysLeft < 30 ? 'Haute' : 'Moyenne',
                    dateCreation: new Date().toISOString(),
                    statut: 'Active', link: '/dashboard/contrats'
                });
            }
        });

        // 3. Tickets / Plaintes ouverts (gestionnaire seulement)
        if (!isOwner) {
            try {
                const ticketsRes = await pool.query(
                    `SELECT t.id, t.titre, t.description, t.priorite, t.date_creation
                     FROM tickets t WHERE t.statut = 'ouvert'`
                );
                ticketsRes.rows.forEach((row: any) => {
                    const id = `tick_${row.id}`;
                    if (!dismissedIds.has(id)) {
                        alerts.push({
                            id, reference: `TCK-${row.id}`,
                            titre: `Plainte: ${row.titre}`,
                            description: row.description,
                            destinataire: 'Technicien/Gestionnaire', type: 'Intervention',
                            priorite: row.priorite === 'Urgent' ? 'Urgente' : (row.priorite || 'Moyenne'),
                            dateCreation: row.date_creation,
                            statut: 'Active', link: '/dashboard/interventions'
                        });
                    }
                });
            } catch (e) {
                console.warn('Tickets table might not exist or empty', e);
            }
        }

        // 4. Lots vacants
        const vacantQuery = `
            SELECT lo.id, lo.ref_lot, b.nom as building_name
            FROM lots lo
            JOIN buildings b ON lo.building_id = b.id
            WHERE (lo.statut = 'libre' OR lo.statut = 'disponible')
            ${ownerFilter}
        `;
        const vacantRes = await pool.query(vacantQuery, ownerParams);
        vacantRes.rows.forEach((row: any) => {
            const id = `vac_${row.id}`;
            if (!dismissedIds.has(id)) {
                alerts.push({
                    id, reference: `VAC-${row.id}`,
                    titre: 'Lot vacant',
                    description: `Le lot ${row.ref_lot ?? ''} (${row.building_name}) est libre.`,
                    destinataire: 'Commercial', type: 'Commercial',
                    priorite: 'Basse', dateCreation: new Date().toISOString(),
                    statut: 'Active', link: '/dashboard/biens?tab=lots'
                });
            }
        });

        // Tri : Urgente → Haute → Moyenne → Basse
        const priorityOrder: { [k: string]: number } = { 'Urgente': 1, 'Haute': 2, 'Moyenne': 3, 'Basse': 4 };
        alerts.sort((a, b) => {
            const pA = priorityOrder[a.priorite] || 3;
            const pB = priorityOrder[b.priorite] || 3;
            if (pA !== pB) return pA - pB;
            return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
        });

        // Stats : nombre d'alertes ignorées (proxy pour "résolues manuellement")
        const resolvedCount = dismissedIds.size;

        res.json({ alerts, dismissedCount: resolvedCount });

    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des alertes' });
    }
});

// POST /api/alertes/:id/dismiss — Ignorer une alerte
router.post('/:id/dismiss', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const alertId = req.params.id;

        await pool.query(
            `INSERT INTO dismissed_alerts (user_id, alert_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, alert_id) DO NOTHING`,
            [userId, alertId]
        );

        res.json({ success: true, message: 'Alerte ignorée' });
    } catch (error) {
        console.error('Error dismissing alert:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/alertes/dismissed — Réinitialiser les alertes ignorées (tout réafficher)
router.delete('/dismissed', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        await pool.query('DELETE FROM dismissed_alerts WHERE user_id = $1', [userId]);
        res.json({ success: true, message: 'Alertes ignorées réinitialisées' });
    } catch (error) {
        console.error('Error resetting dismissed alerts:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
