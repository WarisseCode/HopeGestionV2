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

// Deux jeux de noms acceptés : ceux du web (FinanceSchedules.tsx → payment_method,
// reference) et ceux des règles de validation de la route (montant, mode_paiement,
// date_paiement). Si les deux sont fournis, les noms français l'emportent.
export interface SchedulePayData {
    payment_method?: string;
    reference?: string;
    montant?: number | string;
    mode_paiement?: string;
    date_paiement?: string;
}

/** Arrondi au centime : évite les écarts flottants sur les comparaisons de montants. */
const toCents = (value: number) => Math.round(value * 100) / 100;

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

    // effectiveOwnerIds : liste des propriétaires autorisés (resolvedOwnerId unique OU
    // validOwnerIds pour un gestionnaire multi-propriétaires). Filtrer par = ANY(...)
    // évite le bug "owner_id = NULL" qui vidait toute la page pour un compte multi-owner.
    static async getPayments(dbClient: PoolClient, effectiveOwnerIds: number[], filters: PaymentFilters) {
        const params: any[] = [effectiveOwnerIds];
        let paramIndex = 2;
        let query = `
            SELECT ${SELECT_PAYMENTS_FIELDS},
                l.reference_bail, l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom, t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom, o.address as proprietaire_adresse, o.phone as proprietaire_tel
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            WHERE p.owner_id = ANY($1::int[])
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
        effectiveOwnerIds: number[],
        data: CreatePaymentData,
        userId: number
    ) {
        await dbClient.query('BEGIN');
        try {
            if (!data.lease_id || !data.amount || data.amount <= 0) {
                throw Object.assign(new Error('Données invalides'), { statusCode: 400 });
            }

            // [SÉCURITÉ] Vérifie l'appartenance du bail à l'un des propriétaires autorisés ET
            // dérive l'owner réel du bail. Pour un gestionnaire multi-owner, resolvedOwnerId est
            // null → on ne peut pas écrire owner_id en dur ; l'owner du bail fait foi.
            const leaseCheck = await dbClient.query(
                'SELECT owner_id FROM leases WHERE id = $1 AND owner_id = ANY($2::int[])',
                [data.lease_id, effectiveOwnerIds]
            );
            if (leaseCheck.rows.length === 0) {
                throw Object.assign(new Error('Bail introuvable pour ce propriétaire'), { statusCode: 404 });
            }
            const ownerId = leaseCheck.rows[0].owner_id;

            // Positionne le contexte RLS sur l'owner du bail (transaction-local) pour que la
            // WITH CHECK de la policy payments accepte l'INSERT même en multi-owner.
            await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(ownerId)]);

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

    static async getStats(dbClient: PoolClient, effectiveOwnerIds: number[], month: number, year: number) {
        const [encashedRes, expensesRes, pendingRes] = await Promise.all([
            dbClient.query(`
                SELECT SUM(montant) as total FROM payments
                WHERE owner_id = ANY($1::int[])
                AND EXTRACT(MONTH FROM date_paiement) = $2 AND EXTRACT(YEAR FROM date_paiement) = $3
                AND statut = 'valide'
            `, [effectiveOwnerIds, month, year]),
            dbClient.query(`
                SELECT SUM(amount) as total FROM expenses
                WHERE owner_id = ANY($1::int[])
                AND EXTRACT(MONTH FROM date_expense) = $2 AND EXTRACT(YEAR FROM date_expense) = $3
            `, [effectiveOwnerIds, month, year]),
            dbClient.query(`
                SELECT SUM(ps.total_amount - ps.amount_paid) as total
                FROM payment_schedules ps JOIN leases l ON ps.lease_id = l.id
                WHERE l.owner_id = ANY($1::int[]) AND ps.status IN ('pending', 'partial', 'overdue')
                AND EXTRACT(MONTH FROM ps.due_date) = $2 AND EXTRACT(YEAR FROM ps.due_date) = $3
            `, [effectiveOwnerIds, month, year]),
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

    static async getMonthlyStats(dbClient: PoolClient, effectiveOwnerIds: number[], months: number) {
        const [revenueRes, expenseRes] = await Promise.all([
            dbClient.query(`
                SELECT EXTRACT(MONTH FROM date_paiement)::int as month,
                       EXTRACT(YEAR FROM date_paiement)::int as year,
                       SUM(montant) as total
                FROM payments
                WHERE owner_id = ANY($1::int[])
                AND date_paiement >= (CURRENT_DATE - INTERVAL '1 month' * $2) AND statut = 'valide'
                GROUP BY year, month ORDER BY year, month
            `, [effectiveOwnerIds, months]),
            dbClient.query(`
                SELECT EXTRACT(MONTH FROM date_expense)::int as month,
                       EXTRACT(YEAR FROM date_expense)::int as year,
                       SUM(amount) as total
                FROM expenses
                WHERE owner_id = ANY($1::int[])
                AND date_expense >= (CURRENT_DATE - INTERVAL '1 month' * $2)
                GROUP BY year, month ORDER BY year, month
            `, [effectiveOwnerIds, months]),
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
    static async getBuildingStats(dbClient: PoolClient, effectiveOwnerIds: number[], buildingId: string) {
        // [SÉCURITÉ] Vérifie que l'immeuble appartient à l'un des owners autorisés — anti-IDOR cross-tenant
        const buildingCheck = await dbClient.query(
            'SELECT id FROM buildings WHERE id = $1 AND owner_id = ANY($2::int[])',
            [buildingId, effectiveOwnerIds]
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
        effectiveOwnerIds: number[],
        startDate?: string,
        endDate?: string
    ) {
        const params: any[] = [effectiveOwnerIds];
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
            WHERE p.owner_id = ANY($1::int[])
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

    /**
     * Encaisse tout ou partie d'une échéance : insère le paiement, met à jour
     * `amount_paid` et le statut, et génère la quittance PDF **uniquement** quand
     * l'échéance est entièrement soldée.
     *
     * Colonnes de statut (`payment_schedules` en a deux, sans migration possible ici) :
     * - `status` (pending/partial/paid) : lu par getSchedules, getStats, RentPaymentService
     *   et la page Échéances du web ;
     * - `statut` (en_attente/partiel/paye) : lu par la page détail du bail du web
     *   (LocationDetails.tsx) et écrit par POST /api/paiements.
     * Cette méthode écrit les deux, et considère l'échéance soldée si l'une OU l'autre le
     * dit, ou si `amount_paid` atteint `total_amount` (seule valeur tenue à jour par toutes
     * les routes d'encaissement).
     */
    static async paySchedule(
        dbClient: PoolClient,
        scheduleId: string,
        effectiveOwnerIds: number[],
        data: SchedulePayData
    ) {
        await dbClient.query('BEGIN');
        try {
            // [SÉCURITÉ] Vérifie que l'échéance appartient à cet owner — empêche l'IDOR cross-tenant.
            // FOR UPDATE OF ps : verrouille la ligne de l'échéance jusqu'au COMMIT/ROLLBACK. Un
            // second encaissement simultané de la même échéance attend ici, puis relit
            // amount_paid à jour (→ 409 si le premier l'a soldée) au lieu d'encaisser deux fois.
            const scheduleRes = await dbClient.query(
                `SELECT ps.*, l.tenant_id, l.owner_id
                 FROM payment_schedules ps JOIN leases l ON ps.lease_id = l.id
                 WHERE ps.id = $1 AND l.owner_id = ANY($2::int[])
                 FOR UPDATE OF ps`,
                [scheduleId, effectiveOwnerIds]
            );
            if (scheduleRes.rows.length === 0) {
                throw Object.assign(new Error('Échéance non trouvée'), { statusCode: 404 });
            }
            const schedule = scheduleRes.rows[0];

            const total = toCents(parseFloat(schedule.total_amount) || 0);
            const dejaPaye = toCents(parseFloat(schedule.amount_paid) || 0);
            const resteDu = toCents(total - dejaPaye);

            if (schedule.status === 'paid' || schedule.statut === 'paye' || resteDu <= 0) {
                throw Object.assign(new Error('Échéance déjà soldée'), { statusCode: 409 });
            }

            // Montant facultatif : reste dû par défaut (comportement attendu par le web, qui
            // n'envoie jamais de montant). Fourni : strictement positif et ≤ reste dû.
            const montantFourni = data.montant !== undefined && data.montant !== null && data.montant !== '';
            const montant = montantFourni ? toCents(Number(data.montant)) : resteDu;
            if (!Number.isFinite(montant) || montant <= 0 || montant > resteDu) {
                throw Object.assign(
                    new Error(`Montant invalide : il doit être supérieur à 0 et au plus égal au reste dû (${resteDu}).`),
                    { statusCode: 400 }
                );
            }

            const nouveauPaye = toCents(dejaPaye + montant);
            const estSoldee = nouveauPaye >= total;

            await dbClient.query(
                // $4 (booléen dédié) plutôt que de réutiliser $2 dans le CASE : un même paramètre
                // employé dans deux contextes de type différents provoque l'erreur 42P08
                // (déjà rencontrée dans paiementRoutes.ts).
                `UPDATE payment_schedules
                 SET amount_paid = $1,
                     status = $2,
                     statut = $3,
                     date_reglement_final = CASE WHEN $4::boolean THEN NOW() ELSE date_reglement_final END
                 WHERE id = $5`,
                [nouveauPaye, estSoldee ? 'paid' : 'partial', estSoldee ? 'paye' : 'partiel', estSoldee, scheduleId]
            );

            // Contexte RLS sur l'owner du bail (transaction-local), comme createPayment : pour un
            // gestionnaire multi-propriétaires, sans lui, la WITH CHECK de la policy payments
            // rejetterait l'INSERT (owner_id ≠ get_current_owner_id()).
            await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(schedule.owner_id)]);

            // statut = 'valide' (et non 'paid') : c'est la valeur reconnue par toutes les
            // lectures de revenus (getStats, getMonthlyStats, lookup quittance) et la convention
            // commune aux paiements en ligne/mobile money. 'paid' reste correct pour
            // payment_schedules.status ci-dessus (l'échéance), mais pas pour payments.statut.
            const paymentRes = await dbClient.query(
                `INSERT INTO payments (
                    lease_id, schedule_id, montant, date_paiement, mode_paiement,
                    reference_transaction, type, statut, owner_id, description
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, 'loyer', 'valide', $7, $8)
                 RETURNING id`,
                [
                    schedule.lease_id, scheduleId, montant,
                    data.date_paiement || new Date(),
                    data.mode_paiement || data.payment_method || 'especes',
                    data.reference || null,
                    schedule.owner_id, schedule.description || 'Paiement loyer',
                ]
            );
            const paymentId = paymentRes.rows[0].id;

            await dbClient.query('COMMIT');

            // Quittance uniquement au solde (après COMMIT, non bloquante pour la réponse) :
            // un acompte n'en produit pas.
            let receiptUrl: string | null = null;
            if (estSoldee) {
                try {
                    receiptUrl = await receiptService.generateReceipt(paymentId);
                } catch (err) {
                    console.error('Error generating receipt:', err);
                }
            }

            return {
                schedule: {
                    ...schedule,
                    amount_paid: nouveauPaye,
                    status: estSoldee ? 'paid' : 'partial',
                    statut: estSoldee ? 'paye' : 'partiel',
                    quittance_url: receiptUrl,
                },
                receiptUrl,
                payment: { id: paymentId, montant },
                reste_du: toCents(total - nouveauPaye),
                soldee: estSoldee,
            };
        } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
        }
    }

    // ── Génération des échéances (hors tenantGuard — crée sa propre connexion) ──

    // effectiveOwnerIds OBLIGATOIRE : sans ce filtre, un seul clic "Générer Loyers" balayait
    // TOUS les baux de la base (toutes les agences) → franchissement multi-tenant. On restreint
    // la génération aux propriétaires gérés par l'utilisateur courant.
    static async generateMonthlySchedules(month: number, year: number, effectiveOwnerIds: number[]) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const startDate = new Date(year, month - 1, 1);
            const endDate   = new Date(year, month, 0);

            const leasesRes = await client.query(`
                SELECT id, loyer_actuel, charges_mensuelles, jour_echeance, tenant_id
                FROM leases
                WHERE statut = 'actif'
                AND owner_id = ANY($3::int[])
                AND date_debut <= $1 AND (date_fin IS NULL OR date_fin >= $2)
            `, [endDate, startDate, effectiveOwnerIds]);

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
