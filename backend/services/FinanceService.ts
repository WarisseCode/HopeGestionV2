// backend/services/FinanceService.ts
// ⚠️ RÈGLE ARCHITECTURE : Les méthodes qui reçoivent un dbClient (tenantGuard) ne créent
// PAS de nouvelle connexion pool. generateMonthlySchedules est l'exception car il s'exécute
// hors tenantGuard (pas de dbClient disponible dans la route).

import pool from '../db/database';
import { PoolClient } from 'pg';
import { receiptService } from './ReceiptService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentFilters {
    lease_id?: string | number;
    start_date?: string;
    end_date?: string;
    statut?: string;
    type?: string;
}

export interface CreatePaymentData {
    lease_id: number;
    schedule_id?: number;
    amount: number;
    payment_date?: string;
    payment_method?: string;
    reference?: string;
    type?: string;
    description?: string;
}

export interface SchedulePayData {
    payment_method?: string;
    reference?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SELECT_PAYMENTS_FIELDS = `
    p.id, p.lease_id, p.schedule_id,
    p.montant as amount, p.date_paiement as payment_date,
    p.mode_paiement as payment_method, p.reference_transaction as reference,
    p.type, p.statut, p.description, p.created_at, p.owner_id
`;

// ── Service ───────────────────────────────────────────────────────────────────

export class FinanceService {

    // ── Paiements ─────────────────────────────────────────────────────────────

    static async getPayments(dbClient: PoolClient, ownerId: number, filters: PaymentFilters) {
        const params: any[] = [ownerId];
        let paramIndex = 2;
        let query = `
            SELECT ${SELECT_PAYMENTS_FIELDS},
                l.reference_bail, l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom, t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            WHERE p.owner_id = $1
        `;

        if (filters.lease_id)  { query += ` AND p.lease_id = $${paramIndex++}`;        params.push(filters.lease_id); }
        if (filters.start_date){ query += ` AND p.date_paiement >= $${paramIndex++}`;  params.push(filters.start_date); }
        if (filters.end_date)  { query += ` AND p.date_paiement <= $${paramIndex++}`;  params.push(filters.end_date); }
        if (filters.statut)    { query += ` AND p.statut = $${paramIndex++}`;          params.push(filters.statut); }
        if (filters.type)      { query += ` AND p.type = $${paramIndex++}`;            params.push(filters.type); }

        query += ` ORDER BY p.date_paiement DESC, p.created_at DESC`;

        const result = await dbClient.query(query, params);
        return result.rows;
    }

    /** Enregistre un paiement et met à jour l'échéance associée si schedule_id fourni. */
    static async createPayment(
        dbClient: PoolClient,
        ownerId: number,
        data: CreatePaymentData,
        userId: number
    ) {
        await dbClient.query('BEGIN');
        try {
            if (!data.lease_id || !data.amount || data.amount <= 0) {
                throw Object.assign(new Error('Données invalides'), { statusCode: 400 });
            }

            // [SÉCURITÉ] Vérifie que le bail appartient à cet owner — empêche l'insertion cross-tenant
            const leaseCheck = await dbClient.query(
                'SELECT id FROM leases WHERE id = $1 AND owner_id = $2',
                [data.lease_id, ownerId]
            );
            if (leaseCheck.rows.length === 0) {
                throw Object.assign(new Error('Bail introuvable pour ce propriétaire'), { statusCode: 404 });
            }

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
                data.lease_id, data.schedule_id, data.amount, data.payment_date || new Date(),
                data.payment_method || 'especes', data.reference, data.type || 'loyer',
                data.description, userId, ownerId,
            ]);

            const payment = insertRes.rows[0];

            if (data.schedule_id) {
                const schedRes = await dbClient.query(
                    'SELECT * FROM payment_schedules WHERE id = $1',
                    [data.schedule_id]
                );
                const schedule = schedRes.rows[0];
                if (schedule) {
                    const newPaid = parseFloat(schedule.amount_paid || 0) + data.amount;
                    const newStatus = newPaid >= parseFloat(schedule.total_amount)
                        ? 'paid'
                        : newPaid > 0 ? 'partial' : schedule.status;
                    await dbClient.query(
                        'UPDATE payment_schedules SET amount_paid = $1, status = $2 WHERE id = $3',
                        [newPaid, newStatus, data.schedule_id]
                    );
                }
            }

            await dbClient.query('COMMIT');
            return payment;
        } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
        }
    }

    // ── Statistiques ──────────────────────────────────────────────────────────

    static async getStats(dbClient: PoolClient, ownerId: number, month: number, year: number) {
        const [encashedRes, expensesRes, pendingRes] = await Promise.all([
            dbClient.query(`
                SELECT SUM(montant) as total FROM payments
                WHERE owner_id = $1
                AND EXTRACT(MONTH FROM date_paiement) = $2 AND EXTRACT(YEAR FROM date_paiement) = $3
                AND statut = 'valide'
            `, [ownerId, month, year]),
            dbClient.query(`
                SELECT SUM(amount) as total FROM expenses
                WHERE owner_id = $1
                AND EXTRACT(MONTH FROM date_expense) = $2 AND EXTRACT(YEAR FROM date_expense) = $3
            `, [ownerId, month, year]),
            dbClient.query(`
                SELECT SUM(ps.total_amount - ps.amount_paid) as total
                FROM payment_schedules ps JOIN leases l ON ps.lease_id = l.id
                WHERE l.owner_id = $1 AND ps.status IN ('pending', 'partial', 'overdue')
                AND ps.due_date <= CURRENT_DATE
            `, [ownerId]),
        ]);

        const income   = parseFloat(encashedRes.rows[0].total || '0');
        const expenses = parseFloat(expensesRes.rows[0].total || '0');
        return {
            encashed_month: income,
            expenses_month: expenses,
            net_balance:    income - expenses,
            pending_total:  parseFloat(pendingRes.rows[0].total || '0'),
        };
    }

    static async getMonthlyStats(dbClient: PoolClient, ownerId: number, months: number) {
        const [revenueRes, expenseRes] = await Promise.all([
            dbClient.query(`
                SELECT EXTRACT(MONTH FROM date_paiement)::int as month,
                       EXTRACT(YEAR FROM date_paiement)::int as year,
                       SUM(montant) as total
                FROM payments
                WHERE owner_id = $1
                AND date_paiement >= (CURRENT_DATE - INTERVAL '1 month' * $2) AND statut = 'valide'
                GROUP BY year, month ORDER BY year, month
            `, [ownerId, months]),
            dbClient.query(`
                SELECT EXTRACT(MONTH FROM date_expense)::int as month,
                       EXTRACT(YEAR FROM date_expense)::int as year,
                       SUM(amount) as total
                FROM expenses
                WHERE owner_id = $1
                AND date_expense >= (CURRENT_DATE - INTERVAL '1 month' * $2)
                GROUP BY year, month ORDER BY year, month
            `, [ownerId, months]),
        ]);

        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const now = new Date();

        return Array.from({ length: months }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const rev = revenueRes.rows.find((r: any) => r.month === m && r.year === y);
            const exp = expenseRes.rows.find((r: any) => r.month === m && r.year === y);
            const revenue  = parseFloat(rev?.total || '0');
            const expenses = parseFloat(exp?.total || '0');
            return { label: `${monthNames[m - 1]} ${y}`, month: m, year: y, revenue, expenses, net: revenue - expenses };
        });
    }

    /** Statistiques d'occupation et de recouvrement pour un immeuble donné. */
    static async getBuildingStats(dbClient: PoolClient, ownerId: number, buildingId: string) {
        // [SÉCURITÉ] Vérifie que l'immeuble appartient à cet owner — empêche l'IDOR cross-tenant
        const buildingCheck = await dbClient.query(
            'SELECT id FROM buildings WHERE id = $1 AND owner_id = $2',
            [buildingId, ownerId]
        );
        if (buildingCheck.rows.length === 0) {
            throw Object.assign(new Error('Immeuble introuvable'), { statusCode: 404 });
        }

        const occupancyRes = await dbClient.query(`
            SELECT COUNT(*) as total_lots, COUNT(CASE WHEN statut = 'occupe' THEN 1 END) as occupied_lots
            FROM lots WHERE building_id = $1
        `, [buildingId]);

        const { total_lots, occupied_lots } = occupancyRes.rows[0];
        const occupancy_rate = total_lots > 0 ? (occupied_lots / total_lots) * 100 : 0;

        const currentMonth = new Date().getMonth() + 1;
        const currentYear  = new Date().getFullYear();

        const financeRes = await dbClient.query(`
            SELECT COALESCE(SUM(ps.total_amount), 0) as total_due, COALESCE(SUM(ps.amount_paid), 0) as total_paid
            FROM payment_schedules ps JOIN leases l ON ps.lease_id = l.id JOIN lots lo ON l.lot_id = lo.id
            WHERE lo.building_id = $1
            AND EXTRACT(MONTH FROM ps.due_date) = $2 AND EXTRACT(YEAR FROM ps.due_date) = $3
        `, [buildingId, currentMonth, currentYear]);

        const { total_due, total_paid } = financeRes.rows[0];
        const collection_efficiency = total_due > 0 ? (total_paid / total_due) * 100 : 0;

        return {
            building_id: buildingId,
            stats: {
                total_lots:     parseInt(total_lots),
                occupied_lots:  parseInt(occupied_lots),
                occupancy_rate: Math.round(occupancy_rate * 10) / 10,
                financial_performance: {
                    month: currentMonth, year: currentYear,
                    total_due:             parseFloat(total_due),
                    total_paid:            parseFloat(total_paid),
                    collection_efficiency: Math.round(collection_efficiency * 10) / 10,
                },
            },
        };
    }

    /** Retourne les lignes brutes pour export Excel — la route gère le formatage ExcelJS. */
    static async getPaymentsForExport(
        dbClient: PoolClient,
        ownerId: number,
        startDate?: string,
        endDate?: string
    ) {
        const params: any[] = [ownerId];
        let query = `
            SELECT p.date_paiement, p.montant, p.mode_paiement, p.reference_transaction, p.type, p.statut,
                   l.reference_bail,
                   t.nom as locataire_nom, t.prenoms as locataire_prenoms,
                   o.name as proprietaire_nom, b.nom as immeuble_nom, lo.ref_lot
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE p.owner_id = $1
        `;
        if (startDate) { params.push(startDate); query += ` AND p.date_paiement >= $${params.length}`; }
        if (endDate)   { params.push(endDate);   query += ` AND p.date_paiement <= $${params.length}`; }
        query += ` ORDER BY p.date_paiement DESC`;

        const result = await dbClient.query(query, params);
        return result.rows;
    }

    // ── Échéances ─────────────────────────────────────────────────────────────

    static async getSchedules(dbClient: PoolClient, effectiveOwnerIds: number[], month: number, year: number) {
        const result = await dbClient.query(`
            SELECT
                ps.id, ps.lease_id, ps.total_amount, ps.due_date, ps.status, ps.amount_paid,
                ps.description, ps.created_at,
                t.nom as tenant_nom, t.prenoms as tenant_prenoms, t.telephone_principal as tenant_telephone,
                l.reference_bail, l.loyer_actuel, l.charges_mensuelles,
                lo.ref_lot as lot_reference,
                (SELECT p.quittance_url FROM payments p
                 WHERE p.schedule_id = ps.id AND p.statut = 'valide'
                 ORDER BY p.date_paiement DESC, p.created_at DESC LIMIT 1) as quittance_url,
                (SELECT rpt.status FROM rent_payment_transactions rpt
                 WHERE rpt.schedule_id = ps.id ORDER BY rpt.created_at DESC LIMIT 1) as online_payment_status,
                (SELECT rpt.paid_at FROM rent_payment_transactions rpt
                 WHERE rpt.schedule_id = ps.id AND rpt.status = 'approved'
                 ORDER BY rpt.created_at DESC LIMIT 1) as online_paid_at
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lo ON l.lot_id = lo.id
            WHERE l.owner_id = ANY($1::int[])
            AND EXTRACT(MONTH FROM ps.due_date) = $2 AND EXTRACT(YEAR FROM ps.due_date) = $3
            ORDER BY ps.due_date ASC, t.nom ASC
        `, [effectiveOwnerIds, month, year]);
        return result.rows;
    }

    /** Marque une échéance comme payée, insère le paiement et génère la quittance PDF. */
    static async paySchedule(
        dbClient: PoolClient,
        scheduleId: string,
        effectiveOwnerIds: number[],
        data: SchedulePayData
    ) {
        await dbClient.query('BEGIN');
        try {
            // [SÉCURITÉ] Vérifie que l'échéance appartient à cet owner — empêche l'IDOR cross-tenant
            const scheduleRes = await dbClient.query(
                `SELECT ps.*, l.tenant_id, l.owner_id
                 FROM payment_schedules ps JOIN leases l ON ps.lease_id = l.id
                 WHERE ps.id = $1 AND l.owner_id = ANY($2::int[])`,
                [scheduleId, effectiveOwnerIds]
            );
            if (scheduleRes.rows.length === 0) {
                throw Object.assign(new Error('Échéance non trouvée'), { statusCode: 404 });
            }
            const schedule = scheduleRes.rows[0];
            if (schedule.status === 'paid') {
                throw Object.assign(new Error('Échéance déjà payée'), { statusCode: 400 });
            }

            await dbClient.query(
                `UPDATE payment_schedules
                 SET status = 'paid', amount_paid = total_amount, date_reglement_final = NOW()
                 WHERE id = $1`,
                [scheduleId]
            );

            const paymentRes = await dbClient.query(
                `INSERT INTO payments (
                    lease_id, schedule_id, montant, date_paiement, mode_paiement,
                    reference_transaction, type, statut, owner_id, description
                 )
                 VALUES ($1, $2, $3, NOW(), $4, $5, 'loyer', 'paid', $6, $7)
                 RETURNING id`,
                [
                    schedule.lease_id, scheduleId, schedule.total_amount,
                    data.payment_method || 'especes', data.reference || null,
                    schedule.owner_id, schedule.description || 'Paiement loyer',
                ]
            );

            await dbClient.query('COMMIT');

            // Génération quittance après COMMIT (non bloquant pour la réponse)
            let receiptUrl: string | null = null;
            try {
                receiptUrl = await receiptService.generateReceipt(paymentRes.rows[0].id);
            } catch (err) {
                console.error('Error generating receipt:', err);
            }

            return { schedule: { ...schedule, status: 'paid', quittance_url: receiptUrl }, receiptUrl };
        } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
        }
    }

    // ── Génération des échéances (hors tenantGuard — crée sa propre connexion) ──

    static async generateMonthlySchedules(month: number, year: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const startDate = new Date(year, month - 1, 1);
            const endDate   = new Date(year, month, 0);

            const leasesRes = await client.query(`
                SELECT id, loyer_actuel, charges_mensuelles, jour_echeance, tenant_id
                FROM leases
                WHERE statut = 'actif'
                AND date_debut <= $1 AND (date_fin IS NULL OR date_fin >= $2)
            `, [endDate, startDate]);

            let generatedCount = 0;

            for (const lease of leasesRes.rows) {
                const existingRes = await client.query(`
                    SELECT id FROM payment_schedules
                    WHERE lease_id = $1
                    AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3
                `, [lease.id, month, year]);

                if (existingRes.rows.length === 0) {
                    const daysInMonth = endDate.getDate();
                    const day         = Math.min(lease.jour_echeance || 5, daysInMonth);
                    const dueDate     = new Date(year, month - 1, day);
                    const totalAmount = parseFloat(lease.loyer_actuel || 0) + parseFloat(lease.charges_mensuelles || 0);

                    if (totalAmount > 0) {
                        await client.query(`
                            INSERT INTO payment_schedules (lease_id, total_amount, due_date, status, description)
                            VALUES ($1, $2, $3, 'pending', $4)
                        `, [lease.id, totalAmount, dueDate, `Loyer ${month}/${year}`]);
                        generatedCount++;
                    }
                }
            }

            await client.query('COMMIT');
            return { generated: generatedCount, total_active: leasesRes.rows.length };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
