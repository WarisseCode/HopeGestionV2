import { Router, Response } from 'express';
import { param } from 'express-validator';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { tenantGuard } from '../middleware/tenantGuard';
import pool from '../db/database';

const router = Router();

// L'id d'alerte est un identifiant composite (ex. "late_5", "exp_3"), PAS un entier.
// On le valide donc en string non vide bornée.
const dismissRules = [
    param('id').isString().trim().notEmpty().withMessage('Identifiant d\'alerte requis').isLength({ max: 100 }).withMessage('Identifiant invalide'),
];

// GET /api/alertes
// tenantGuard cadre l'utilisateur sur ses owner_id (validOwnerIds / resolvedOwnerId),
// exactement comme Finances/Biens. Sans ce cadrage, un gestionnaire voyait les
// alertes (lots vacants, retards, tickets) de TOUTE la base → fuite inter-locataires
// et volume énorme identique pour un nouvel inscrit.
router.get('/', protect, tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const userRole = req.userRole;
        const dbClient = (req as any).dbClient;

        // Alertes ignorées par cet utilisateur
        const dismissedRes = await dbClient.query(
            'SELECT alert_id FROM dismissed_alerts WHERE user_id = $1',
            [userId]
        );
        const dismissedIds = new Set(dismissedRes.rows.map((r: any) => r.alert_id));

        // ── Périmètre propriétaire ────────────────────────────────────────────
        // admin : voit tout (aucun filtre). Autres : filtrés sur leurs owner_id.
        // Un utilisateur sans périmètre (nouvel inscrit sans bien) ne voit rien.
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isOwner = userRole === 'owner' || userRole === 'proprietaire';
        const resolvedOwnerId = (req as any).resolvedOwnerId;
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];
        const effectiveOwnerIds: number[] = resolvedOwnerId != null ? [resolvedOwnerId] : validOwnerIds;

        if (!isAdmin && effectiveOwnerIds.length === 0) {
            return res.json({ alerts: [], dismissedCount: dismissedIds.size });
        }

        // Filtres owner explicites (vides pour l'admin). $1 = tableau d'owner_id.
        const ownerParams: any[] = [];
        let lotOwnerFilter = '';
        let ticketOwnerFilter = '';
        if (!isAdmin) {
            ownerParams.push(effectiveOwnerIds);
            lotOwnerFilter = 'AND lo.owner_id = ANY($1::int[])';
            ticketOwnerFilter = 'AND t.owner_id = ANY($1::int[])';
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
            ${lotOwnerFilter}
        `;
        const lateRes = await dbClient.query(latePaymentsQuery, ownerParams);
        lateRes.rows.forEach((row: any) => {
            const id = `late_${row.id}`;
            if (!dismissedIds.has(id)) {
                alerts.push({
                    id, reference: `RET-${row.id}`,
                    titre: 'Loyer en retard',
                    description: `Loyer de ${row.nom} ${row.prenoms} (${row.ref_lot} - ${row.building_name}) non payé.`,
                    destinataire: 'Gestionnaire', type: 'Paiement',
                    priorite: 'Haute', dateCreation: new Date().toISOString(),
                    // Lien vers le bail concerné (row.id = leases.id) plutôt que vers le
                    // module Finances : /dashboard/locations/:id affiche le bail ET son
                    // échéancier, c'est-à-dire précisément l'échéance en retard.
                    statut: 'Active', link: `/dashboard/locations/${row.id}`
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
            ${lotOwnerFilter}
        `;
        const expiringRes = await dbClient.query(expiringQuery, ownerParams);
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
                    // Même principe : le bail qui expire, pas la liste des contrats.
                    statut: 'Active', link: `/dashboard/locations/${row.id}`
                });
            }
        });

        // 3. Tickets / Plaintes ouverts (gestionnaire seulement), cadrés par owner
        if (!isOwner) {
            try {
                const ticketsRes = await dbClient.query(
                    `SELECT t.id, t.titre, t.description, t.priorite, t.date_creation
                     FROM tickets t
                     WHERE t.statut = 'ouvert' AND t.deleted_at IS NULL ${ticketOwnerFilter}`,
                    ownerParams
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

        // 4. Lots vacants — AGRÉGÉS en une seule alerte (évite une alerte par lot,
        //    qui noyait le centre d'alertes). Priorité Basse, purement informatif.
        const vacantQuery = `
            SELECT lo.id, lo.ref_lot, b.nom as building_name
            FROM lots lo
            JOIN buildings b ON lo.building_id = b.id
            WHERE (lo.statut = 'libre' OR lo.statut = 'disponible')
            AND lo.deleted_at IS NULL
            ${lotOwnerFilter}
            ORDER BY lo.id
        `;
        const vacantRes = await dbClient.query(vacantQuery, ownerParams);
        if (vacantRes.rows.length > 0) {
            const id = 'vac_all'; // id stable → "Ignorer" masque le groupe entier
            if (!dismissedIds.has(id)) {
                const count = vacantRes.rows.length;
                const first = vacantRes.rows[0];
                alerts.push({
                    id, reference: 'VAC',
                    titre: count === 1 ? 'Lot vacant' : `${count} lots vacants`,
                    description: count === 1
                        ? `Le lot ${first.ref_lot ?? ''} (${first.building_name}) est libre.`
                        : `${count} lots sont actuellement libres et à commercialiser.`,
                    destinataire: 'Commercial', type: 'Commercial',
                    priorite: 'Basse', dateCreation: new Date().toISOString(),
                    statut: 'Active', link: '/dashboard/biens?tab=lots'
                });
            }
        }

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
router.post('/:id/dismiss', protect, validate(dismissRules), async (req: AuthenticatedRequest, res: Response) => {
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
