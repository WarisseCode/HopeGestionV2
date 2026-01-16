import { Router, Response } from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import pool from '../db/database';

const router = Router();

// GET /api/alertes
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        // Note: For now, we fetch ALL alerts visible to a 'gestionnaire'. 
        // If 'proprietaire', strictly we should filter by owner_id, but per spec 'Alertes' are general for now or filtered by role later.
        // Assuming Gestionnaire view for MVP.
        
        const alerts: any[] = [];

        // 1. Loyers en retard (Late Payments)
        // Leases active, no payment this month, past due date + 5 days grace
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
        `;
        const lateRes = await pool.query(latePaymentsQuery);
        
        lateRes.rows.forEach(row => {
            alerts.push({
                id: `late_${row.id}`,
                reference: `RET-${row.id}`,
                titre: 'Loyer en retard',
                description: `Loyer de ${row.nom} ${row.prenoms} (${row.ref_lot} - ${row.building_name}) non payé.`,
                destinataire: 'Gestionnaire', // Default
                type: 'Paiement',
                priorite: 'Haute',
                dateCreation: new Date().toISOString(), // Dynamic: it is "now"
                statut: 'Active',
                link: '/finances'
            });
        });

        // 2. Fin de contrat proche (Expiring Leases - within 60 days)
        const expiringQuery = `
            SELECT l.id, lo.ref_lot, l.date_fin, t.nom, t.prenoms
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lo ON l.lot_id = lo.id
            WHERE l.statut = 'actif'
            AND l.date_fin IS NOT NULL
            AND l.date_fin <= (CURRENT_DATE + INTERVAL '60 days')
            AND l.date_fin >= CURRENT_DATE
        `;
        const expiringRes = await pool.query(expiringQuery);

        expiringRes.rows.forEach(row => {
            const daysLeft = Math.ceil((new Date(row.date_fin).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            alerts.push({
                id: `exp_${row.id}`,
                reference: `FIN-${row.id}`,
                titre: 'Fin de contrat proche',
                description: `Bail de ${row.nom} ${row.prenoms} (${row.ref_lot}) expire dans ${daysLeft} jours.`,
                destinataire: 'Gestionnaire',
                type: 'Contrat',
                priorite: daysLeft < 30 ? 'Haute' : 'Moyenne',
                dateCreation: new Date().toISOString(),
                statut: 'Active',
                link: '/contrats' // Assuming contrats module
            });
        });

        // 3. Plaintes / Tickets ouverts
        const ticketsQuery = `
            SELECT t.id, t.titre, t.description, t.priorite, t.date_creation
            FROM tickets t
            WHERE t.statut = 'ouvert'
        `;
        // Check if tickets table exists first? user Dashboard used it.
        try {
             const ticketsRes = await pool.query(ticketsQuery);
             ticketsRes.rows.forEach(row => {
                alerts.push({
                    id: `tick_${row.id}`,
                    reference: `TCK-${row.id}`,
                    titre: `Nouvelle plainte: ${row.titre}`,
                    description: row.description,
                    destinataire: 'Technicien/Gestionnaire',
                    type: 'Intervention',
                    priorite: row.priorite === 'Urgent' ? 'Urgente' : row.priorite,
                    dateCreation: row.date_creation,
                    statut: 'Active',
                    link: '/interventions' // Or alertes/tickets
                });
             });
        } catch (e) {
            console.warn("Tickets table might not exist or empty", e);
        }

        // 4. Lots vacants (Low priority alert)
        const vacantQuery = `
            SELECT l.id, l.ref_lot, b.nom as building_name
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            WHERE l.statut = 'libre' OR l.statut = 'disponible'
        `;
        const vacantRes = await pool.query(vacantQuery);
        vacantRes.rows.forEach(row => {
             alerts.push({
                id: `vac_${row.id}`,
                reference: `VAC-${row.id}`,
                titre: 'Lot vacant',
                description: `Le lot ${row.ref_lot} (${row.building_name}) est libre.`,
                destinataire: 'Commercial',
                type: 'Commercial',
                priorite: 'Basse',
                dateCreation: new Date().toISOString(),
                statut: 'Active',
                link: '/biens?tab=lots'
             });
        });
        
        // Sort by priority (Haute/Urgente first) then date
        const priorityOrder: {[key: string]: number} = { 'Urgente': 1, 'Haute': 2, 'Moyenne': 3, 'Basse': 4 };
        
        alerts.sort((a, b) => {
            const pA = priorityOrder[a.priorite] || 3;
            const pB = priorityOrder[b.priorite] || 3;
            if (pA !== pB) return pA - pB;
            return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
        });

        res.json({ alerts });

    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des alertes' });
    }
});

export default router;
