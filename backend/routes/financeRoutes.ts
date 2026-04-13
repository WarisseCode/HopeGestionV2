// backend/routes/financeRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params, req.query, ou req.body.

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import * as ExcelJS from 'exceljs';
import { receiptService } from '../services/ReceiptService';
import { FinanceService } from '../services/FinanceService';

const router = Router();

// Helper to select payments with correct aliases
const SELECT_PAYMENTS_FIELDS = `
    p.id,
    p.lease_id,
    p.schedule_id,
    p.montant as amount,
    p.date_paiement as payment_date,
    p.mode_paiement as payment_method,
    p.reference_transaction as reference,
    p.type,
    p.statut,
    p.description,
    p.created_at,
    p.owner_id
`;

// GET /api/finances - Liste des paiements
// [SÉCURITÉ] owner_id = resolvedOwnerId — buildOwnerWhereClause + pool.query supprimés (C-4)
router.get('/', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { lease_id, start_date, end_date, statut, type } = req.query;

        const params: any[] = [ownerId];
        let paramIndex = 2;

        let query = `
            SELECT
                ${SELECT_PAYMENTS_FIELDS},
                l.reference_bail,
                l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            WHERE p.owner_id = $1
        `;

        if (lease_id) {
            query += ` AND p.lease_id = $${paramIndex}`;
            params.push(lease_id);
            paramIndex++;
        }
        if (start_date) {
            query += ` AND p.date_paiement >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            query += ` AND p.date_paiement <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        if (statut) {
            query += ` AND p.statut = $${paramIndex}`;
            params.push(statut);
            paramIndex++;
        }
        if (type) {
            query += ` AND p.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        query += ` ORDER BY p.date_paiement DESC, p.created_at DESC`;

        const result = await dbClient.query(query, params);
        res.json({ payments: result.rows });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/finances - Enregistrer un paiement
// [SÉCURITÉ] Vérification que le bail appartient à resolvedOwnerId avant INSERT
router.post('/', permissions.canWrite('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        await dbClient.query('BEGIN');
        const {
            lease_id,
            schedule_id,
            amount,
            payment_date,
            payment_method,
            reference,
            type,
            description
        } = req.body;

        if (!lease_id || !amount || parseFloat(amount) <= 0) {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Données invalides' });
        }

        // [SÉCURITÉ] Vérifie que le bail appartient à cet owner — empêche l'insertion cross-tenant
        const leaseCheck = await dbClient.query(
            'SELECT id FROM leases WHERE id = $1 AND owner_id = $2',
            [lease_id, ownerId]
        );
        if (leaseCheck.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Bail introuvable pour ce propriétaire' });
        }

        // IMPORTANT: Map API fields (English) to DB fields (French)
        const insertRes = await dbClient.query(`
            INSERT INTO payments (
                lease_id, schedule_id, montant, date_paiement,
                mode_paiement, reference_transaction, type, description, created_by, owner_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, lease_id, schedule_id, montant as amount, date_paiement as payment_date,
                      mode_paiement as payment_method, reference_transaction as reference,
                      type, statut, description, created_at
        `, [
            lease_id, schedule_id, amount, payment_date || new Date(),
            payment_method || 'especes', reference, type || 'loyer',
            description, req.userId, ownerId
        ]);

        const payment = insertRes.rows[0];

        if (schedule_id) {
            const schedRes = await dbClient.query('SELECT * FROM payment_schedules WHERE id = $1', [schedule_id]);
            const schedule = schedRes.rows[0];
            if (schedule) {
                // payment_schedules uses English columns: total_amount, amount_paid, status, due_date
                const newPaidAmount = parseFloat(schedule.amount_paid || 0) + parseFloat(amount);
                let newStatus = schedule.status;
                if (newPaidAmount >= parseFloat(schedule.total_amount)) {
                    newStatus = 'paid';
                } else if (newPaidAmount > 0) {
                    newStatus = 'partial';
                }
                await dbClient.query(
                    `UPDATE payment_schedules SET amount_paid = $1, status = $2 WHERE id = $3`,
                    [newPaidAmount, newStatus, schedule_id]
                );
            }
        }

        await dbClient.query('COMMIT');
        res.status(201).json(payment);
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Erreur enregistrement paiement' });
    }
});

// GET /api/finances/stats - Statistiques (accepte ?month=X&year=Y, défaut: mois courant)
// [SÉCURITÉ] Filtre owner_id = resolvedOwnerId sur toutes les requêtes — pool.query supprimé
router.get('/stats', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const targetMonth = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
        const targetYear = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

        const encashedRes = await dbClient.query(`
            SELECT SUM(montant) as total
            FROM payments
            WHERE owner_id = $1
            AND EXTRACT(MONTH FROM date_paiement) = $2
            AND EXTRACT(YEAR FROM date_paiement) = $3
            AND statut = 'valide'
        `, [ownerId, targetMonth, targetYear]);

        const expensesRes = await dbClient.query(`
            SELECT SUM(amount) as total
            FROM expenses
            WHERE owner_id = $1
            AND EXTRACT(MONTH FROM date_expense) = $2
            AND EXTRACT(YEAR FROM date_expense) = $3
        `, [ownerId, targetMonth, targetYear]);

        const pendingRes = await dbClient.query(`
            SELECT SUM(ps.total_amount - ps.amount_paid) as total
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            WHERE l.owner_id = $1
            AND ps.status IN ('pending', 'partial', 'overdue')
            AND ps.due_date <= CURRENT_DATE
        `, [ownerId]);

        const income = parseFloat(encashedRes.rows[0].total || '0');
        const expenses = parseFloat(expensesRes.rows[0].total || '0');

        res.json({
            encashed_month: income,
            expenses_month: expenses,
            net_balance: income - expenses,
            pending_total: parseFloat(pendingRes.rows[0].total || '0')
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/stats/monthly - Revenus/Dépenses par mois (pour graphiques)
// [SÉCURITÉ] owner_id = resolvedOwnerId — buildOwnerWhereClause + pool.query supprimés
router.get('/stats/monthly', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const months = parseInt(req.query.months as string) || 6;

        const revenueRes = await dbClient.query(`
            SELECT
                EXTRACT(MONTH FROM date_paiement)::int as month,
                EXTRACT(YEAR FROM date_paiement)::int as year,
                SUM(montant) as total
            FROM payments
            WHERE owner_id = $1
            AND date_paiement >= (CURRENT_DATE - INTERVAL '1 month' * $2)
            AND statut = 'valide'
            GROUP BY year, month
            ORDER BY year, month
        `, [ownerId, months]);

        const expenseRes = await dbClient.query(`
            SELECT
                EXTRACT(MONTH FROM date_expense)::int as month,
                EXTRACT(YEAR FROM date_expense)::int as year,
                SUM(amount) as total
            FROM expenses
            WHERE owner_id = $1
            AND date_expense >= (CURRENT_DATE - INTERVAL '1 month' * $2)
            GROUP BY year, month
            ORDER BY year, month
        `, [ownerId, months]);

        const data = [];
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const rev = revenueRes.rows.find((r: any) => r.month === m && r.year === y);
            const exp = expenseRes.rows.find((r: any) => r.month === m && r.year === y);
            data.push({
                label: `${monthNames[m - 1]} ${y}`,
                month: m,
                year: y,
                revenue: parseFloat(rev?.total || '0'),
                expenses: parseFloat(exp?.total || '0'),
                net: parseFloat(rev?.total || '0') - parseFloat(exp?.total || '0')
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/stats/building/:id - Statistiques détaillées par immeuble
// [SÉCURITÉ] Vérifie que l'immeuble appartient à resolvedOwnerId avant toute requête (IDOR)
router.get('/stats/building/:id', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { id } = req.params;

        // [SÉCURITÉ] Vérifie que l'immeuble appartient à cet owner — empêche l'IDOR cross-tenant
        const buildingCheck = await dbClient.query(
            'SELECT id FROM buildings WHERE id = $1 AND owner_id = $2',
            [id, ownerId]
        );
        if (buildingCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Immeuble introuvable' });
        }

        const occupancyRes = await dbClient.query(`
            SELECT
                COUNT(*) as total_lots,
                COUNT(CASE WHEN statut = 'occupe' THEN 1 END) as occupied_lots
            FROM lots
            WHERE building_id = $1
        `, [id]);

        const { total_lots, occupied_lots } = occupancyRes.rows[0];
        const occupancy_rate = total_lots > 0 ? (occupied_lots / total_lots) * 100 : 0;

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const financeRes = await dbClient.query(`
            SELECT
                COALESCE(SUM(ps.total_amount), 0) as total_due,
                COALESCE(SUM(ps.amount_paid), 0) as total_paid
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            JOIN lots lo ON l.lot_id = lo.id
            WHERE lo.building_id = $1
            AND EXTRACT(MONTH FROM ps.due_date) = $2
            AND EXTRACT(YEAR FROM ps.due_date) = $3
        `, [id, currentMonth, currentYear]);

        const { total_due, total_paid } = financeRes.rows[0];
        const collection_efficiency = total_due > 0 ? (total_paid / total_due) * 100 : 0;

        res.json({
            building_id: id,
            stats: {
                total_lots: parseInt(total_lots),
                occupied_lots: parseInt(occupied_lots),
                occupancy_rate: Math.round(occupancy_rate * 10) / 10,
                financial_performance: {
                    month: currentMonth,
                    year: currentYear,
                    total_due: parseFloat(total_due),
                    total_paid: parseFloat(total_paid),
                    collection_efficiency: Math.round(collection_efficiency * 10) / 10
                }
            }
        });
    } catch (error) {
        console.error('Error fetching building stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/export/excel - Exportation Excel des paiements
// [SÉCURITÉ] owner_id = resolvedOwnerId — buildOwnerWhereClause + pool.query supprimés
router.get('/export/excel', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { start_date, end_date } = req.query;

        const params: any[] = [ownerId];
        let query = `
            SELECT
                p.date_paiement, p.montant, p.mode_paiement, p.reference_transaction, p.type, p.statut,
                l.reference_bail,
                t.nom as locataire_nom, t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom,
                b.nom as immeuble_nom,
                lo.ref_lot
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE p.owner_id = $1
        `;
        if (start_date) { params.push(start_date); query += ` AND p.date_paiement >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND p.date_paiement <= $${params.length}`; }
        query += ` ORDER BY p.date_paiement DESC`;

        const result = await dbClient.query(query, params);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Paiements');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Locataire', key: 'locataire', width: 25 },
            { header: 'Immeuble', key: 'immeuble', width: 20 },
            { header: 'Lot', key: 'lot', width: 10 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Montant', key: 'montant', width: 15 },
            { header: 'Mode', key: 'mode', width: 15 },
            { header: 'Référence', key: 'ref', width: 20 },
            { header: 'Statut', key: 'statut', width: 12 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        result.rows.forEach((p: any) => {
            worksheet.addRow({
                date: new Date(p.date_paiement).toLocaleDateString('fr-FR'),
                locataire: `${p.locataire_prenoms} ${p.locataire_nom}`,
                immeuble: p.immeuble_nom,
                lot: p.ref_lot,
                type: p.type,
                montant: parseFloat(p.montant),
                mode: p.mode_paiement,
                ref: p.reference_transaction,
                statut: p.statut
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Rapport_Financier_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting excel:', error);
        res.status(500).json({ message: 'Erreur lors de l\'exportation' });
    }
});

// POST /api/finances/generate-schedules - Générer les échéances (Admin/Gest)
// ⚠️ FinanceService utilise pool en interne — audit du service à faire séparément (hors scope P-4)
router.post('/generate-schedules', permissions.canWrite('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { month, year } = req.body;
        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const result = await FinanceService.generateMonthlySchedules(targetMonth, targetYear);
        res.json({ message: 'Génération terminée', details: result });
    } catch (error) {
        console.error('Error generating schedules:', error);
        res.status(500).json({ message: 'Erreur lors de la génération des échéances' });
    }
});

// GET /api/finances/schedules - Liste des échéances avec infos locataire
// [SÉCURITÉ] l.owner_id = resolvedOwnerId — ownerIds.join(',') interpolé supprimé + pool.query supprimé
router.get('/schedules', permissions.canRead('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

        // [RLS] dbClient filtre automatiquement via get_current_owner_id()
        // WHERE l.owner_id = $1 reste en défense en profondeur
        const result = await dbClient.query(`
            SELECT
                ps.id,
                ps.lease_id,
                ps.total_amount,
                ps.due_date,
                ps.status,
                ps.amount_paid,
                ps.description,
                ps.created_at,
                t.nom as tenant_nom,
                t.prenoms as tenant_prenoms,
                t.telephone_principal as tenant_telephone,
                l.reference_bail,
                l.loyer_actuel,
                l.charges_mensuelles,
                lo.ref_lot as lot_reference,
                (
                    SELECT p.quittance_url
                    FROM payments p
                    WHERE p.schedule_id = ps.id
                    AND p.statut = 'valide'
                    ORDER BY p.date_paiement DESC, p.created_at DESC
                    LIMIT 1
                ) as quittance_url,
                (
                    SELECT rpt.status
                    FROM rent_payment_transactions rpt
                    WHERE rpt.schedule_id = ps.id
                    ORDER BY rpt.created_at DESC
                    LIMIT 1
                ) as online_payment_status,
                (
                    SELECT rpt.paid_at
                    FROM rent_payment_transactions rpt
                    WHERE rpt.schedule_id = ps.id AND rpt.status = 'approved'
                    ORDER BY rpt.created_at DESC
                    LIMIT 1
                ) as online_paid_at
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lo ON l.lot_id = lo.id
            WHERE l.owner_id = $1
            AND EXTRACT(MONTH FROM ps.due_date) = $2
            AND EXTRACT(YEAR FROM ps.due_date) = $3
            ORDER BY ps.due_date ASC, t.nom ASC
        `, [ownerId, targetMonth, targetYear]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ message: 'Erreur chargement échéances' });
    }
});

// PUT /api/finances/schedules/:id/pay - Marquer une échéance comme payée
// [SÉCURITÉ] Vérification ownership du schedule + tenantGuard + dbClient pour la transaction
router.put('/schedules/:id/pay', permissions.canWrite('finances'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        await dbClient.query('BEGIN');
        const { id } = req.params;
        const { payment_method, reference } = req.body;

        // [SÉCURITÉ] Vérifie que l'échéance appartient à cet owner — empêche l'IDOR cross-tenant
        const scheduleRes = await dbClient.query(
            `SELECT ps.*, l.tenant_id, l.owner_id
             FROM payment_schedules ps
             JOIN leases l ON ps.lease_id = l.id
             WHERE ps.id = $1 AND l.owner_id = $2`,
            [id, ownerId]
        );
        if (scheduleRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Échéance non trouvée' });
        }
        const schedule = scheduleRes.rows[0];
        if (schedule.status === 'paid') {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Échéance déjà payée' });
        }

        await dbClient.query(
            `UPDATE payment_schedules
             SET status = 'paid', amount_paid = total_amount, date_reglement_final = NOW()
             WHERE id = $1`,
            [id]
        );

        const paymentRes = await dbClient.query(
            `INSERT INTO payments (lease_id, schedule_id, montant, date_paiement, mode_paiement, reference_transaction, type, statut, owner_id, description)
             VALUES ($1, $2, $3, NOW(), $4, $5, 'loyer', 'paid', $6, $7)
             RETURNING id`,
            [
                schedule.lease_id,
                id,
                schedule.total_amount,
                payment_method || 'especes',
                reference || null,
                schedule.owner_id,
                schedule.description || `Paiement loyer`
            ]
        );

        const paymentId = paymentRes.rows[0].id;
        await dbClient.query('COMMIT');

        // Génération quittance PDF après COMMIT (receiptService utilise pool en interne — non bloquant)
        let receiptUrl = null;
        try {
            receiptUrl = await receiptService.generateReceipt(paymentId);
        } catch (err) {
            console.error('Error generating receipt:', err);
        }

        res.json({
            message: 'Échéance marquée comme payée',
            schedule: { ...schedule, status: 'paid', quittance_url: receiptUrl },
            receiptUrl
        });
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error paying schedule:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Erreur paiement échéance',
            details: String(error)
        });
    }
});

export default router;
