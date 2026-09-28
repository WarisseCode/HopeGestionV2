/**
 * Tests unitaires — FinanceService.paySchedule (encaissement par échéance).
 *
 * dbClient simulé : il interprète les requêtes de paySchedule (SELECT … FOR UPDATE,
 * UPDATE payment_schedules, INSERT INTO payments) sur un état en mémoire, ce qui permet
 * d'enchaîner acompte puis solde et de vérifier la somme réellement encaissée.
 * Pas de base réelle : le verrou FOR UPDATE est vérifié sur le texte SQL, pas en
 * concurrence effective.
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/ReceiptService', () => ({
    receiptService: { generateReceipt: jest.fn() },
}));

import { FinanceService } from '../../services/FinanceService';
import { receiptService } from '../../services/ReceiptService';

interface ScheduleRow {
    id: number;
    lease_id: number;
    total_amount: string;
    amount_paid: string;
    status: string;
    statut: string;
    description: string | null;
    owner_id: number;
    tenant_id: number;
}

/** Faux dbClient : état d'une échéance + paiements insérés. */
function fakeDb(initial: Partial<ScheduleRow> = {}) {
    const schedule: ScheduleRow = {
        id: 12,
        lease_id: 8,
        total_amount: '185000.00', // NUMERIC renvoyé en chaîne par node-postgres
        amount_paid: '0.00',
        status: 'pending',
        statut: 'en_attente',
        description: 'Loyer 9/2026',
        owner_id: 3,
        tenant_id: 5,
        ...initial,
    };
    const payments: { id: number; params: any[] }[] = [];
    let nextPaymentId = 100;

    const query = jest.fn(async (sql: string, params: any[] = []) => {
        if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql.trim())) return { rows: [] };
        if (sql.includes('FROM payment_schedules ps JOIN leases l')) {
            const [id, ownerIds] = params;
            const visible = String(schedule.id) === String(id) && ownerIds.includes(schedule.owner_id);
            return { rows: visible ? [{ ...schedule }] : [] };
        }
        if (sql.includes('UPDATE payment_schedules')) {
            const [amountPaid, status, statut] = params;
            schedule.amount_paid = String(amountPaid);
            schedule.status = status;
            schedule.statut = statut;
            return { rows: [], rowCount: 1 };
        }
        if (sql.includes('set_config')) return { rows: [] };
        if (sql.includes('INSERT INTO payments')) {
            const id = nextPaymentId++;
            payments.push({ id, params });
            return { rows: [{ id }] };
        }
        throw new Error(`Requête inattendue : ${sql}`);
    });

    return { client: { query } as any, query, schedule, payments };
}

const sqlCalls = (query: jest.Mock) => query.mock.calls.map((c) => String(c[0]));
const wrote = (query: jest.Mock) =>
    sqlCalls(query).some((sql) => sql.includes('UPDATE payment_schedules') || sql.includes('INSERT INTO payments'));

describe('FinanceService.paySchedule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (receiptService.generateReceipt as jest.Mock).mockResolvedValue('/uploads/receipts/q.pdf');
    });

    describe('échéance déjà soldée → 409, aucune écriture', () => {
        it.each([
            ['status = paid', { status: 'paid' }],
            ["statut = paye (écrit par POST /api/paiements)", { statut: 'paye' }],
            ['amount_paid = total_amount', { amount_paid: '185000.00' }],
        ])('%s', async (_label, initial) => {
            const db = fakeDb(initial);

            await expect(FinanceService.paySchedule(db.client, '12', [3], {}))
                .rejects.toMatchObject({ statusCode: 409 });

            expect(wrote(db.query)).toBe(false);
            expect(sqlCalls(db.query)).toContain('ROLLBACK');
            expect(receiptService.generateReceipt).not.toHaveBeenCalled();
        });
    });

    it('échéance d\'un autre propriétaire → 404, aucune écriture', async () => {
        const db = fakeDb();

        await expect(FinanceService.paySchedule(db.client, '12', [99], {}))
            .rejects.toMatchObject({ statusCode: 404 });
        expect(wrote(db.query)).toBe(false);
    });

    describe('montant fourni invalide → 400, aucune écriture', () => {
        it.each([
            ['supérieur au reste dû', 185000.01],
            ['supérieur au reste dû après acompte', 150000],
            ['nul', 0],
            ['négatif', -10],
            ['non numérique', 'abc'],
        ])('%s', async (_label, montant) => {
            const db = fakeDb({ amount_paid: '50000.00', status: 'partial', statut: 'partiel' });
            // Reste dû : 135 000. 185000.01 et 150000 le dépassent.

            await expect(FinanceService.paySchedule(db.client, '12', [3], { montant }))
                .rejects.toMatchObject({ statusCode: 400 });
            expect(wrote(db.query)).toBe(false);
        });
    });

    it('acompte puis solde : somme des paiements = total, quittance seulement au solde', async () => {
        const db = fakeDb();

        const acompte = await FinanceService.paySchedule(db.client, '12', [3], { montant: 50000 });

        expect(acompte.soldee).toBe(false);
        expect(acompte.reste_du).toBe(135000);
        expect(acompte.receiptUrl).toBeNull();
        expect(receiptService.generateReceipt).not.toHaveBeenCalled();
        expect(db.schedule).toMatchObject({ amount_paid: '50000', status: 'partial', statut: 'partiel' });

        // Sans montant : le reste dû (135 000), pas le total (ancien comportement).
        const solde = await FinanceService.paySchedule(db.client, '12', [3], {});

        expect(solde.soldee).toBe(true);
        expect(solde.reste_du).toBe(0);
        expect(solde.payment.montant).toBe(135000);
        expect(db.schedule).toMatchObject({ amount_paid: '185000', status: 'paid', statut: 'paye' });

        const montants = db.payments.map((p) => p.params[2]);
        expect(montants).toEqual([50000, 135000]);
        expect(montants.reduce((a, b) => a + b, 0)).toBe(185000);

        // Une seule quittance, pour le paiement qui solde l'échéance.
        expect(receiptService.generateReceipt).toHaveBeenCalledTimes(1);
        expect(receiptService.generateReceipt).toHaveBeenCalledWith(db.payments[1].id);
        expect(solde.receiptUrl).toBe('/uploads/receipts/q.pdf');

        // Troisième tentative : déjà soldée.
        await expect(FinanceService.paySchedule(db.client, '12', [3], {}))
            .rejects.toMatchObject({ statusCode: 409 });
    });

    it('montant égal au reste dû : solde + quittance', async () => {
        const db = fakeDb();

        const r = await FinanceService.paySchedule(db.client, '12', [3], { montant: '185000' });

        expect(r.soldee).toBe(true);
        expect(receiptService.generateReceipt).toHaveBeenCalledTimes(1);
    });

    it('champs du web acceptés (payment_method, reference), défaut = reste dû', async () => {
        const db = fakeDb();

        await FinanceService.paySchedule(db.client, '12', [3], {
            payment_method: 'mobile_money',
            reference: 'MM-123',
        });

        // INSERT : [lease_id, schedule_id, montant, date, mode, référence, owner_id, description]
        const [leaseId, scheduleId, montant, date, mode, reference, ownerId] = db.payments[0].params;
        expect(leaseId).toBe(8);
        expect(scheduleId).toBe('12');
        expect(montant).toBe(185000);
        expect(date).toBeInstanceOf(Date); // date du jour par défaut
        expect(mode).toBe('mobile_money');
        expect(reference).toBe('MM-123');
        expect(ownerId).toBe(3);
    });

    it('champs des règles de validation acceptés, prioritaires sur ceux du web', async () => {
        const db = fakeDb();

        await FinanceService.paySchedule(db.client, '12', [3], {
            montant: 60000,
            mode_paiement: 'virement',
            payment_method: 'especes',
            date_paiement: '2026-09-15',
        });

        const [, , montant, date, mode] = db.payments[0].params;
        expect(montant).toBe(60000);
        expect(date).toBe('2026-09-15');
        expect(mode).toBe('virement');
    });

    it('verrouille l\'échéance (SELECT … FOR UPDATE) avant toute écriture', async () => {
        const db = fakeDb();

        await FinanceService.paySchedule(db.client, '12', [3], {});

        const calls = sqlCalls(db.query);
        const selectIndex = calls.findIndex((sql) => sql.includes('FROM payment_schedules ps JOIN leases l'));
        const updateIndex = calls.findIndex((sql) => sql.includes('UPDATE payment_schedules'));
        expect(calls[0]).toBe('BEGIN');
        expect(calls[selectIndex]).toMatch(/FOR UPDATE OF ps/);
        expect(selectIndex).toBeLessThan(updateIndex);
    });

    it('écrit les deux colonnes de statut et positionne le contexte RLS du bail', async () => {
        const db = fakeDb();

        await FinanceService.paySchedule(db.client, '12', [3], { montant: 1000 });

        const update = db.query.mock.calls.find((c) => String(c[0]).includes('UPDATE payment_schedules'))!;
        expect(update[0]).toMatch(/status = \$2/);
        expect(update[0]).toMatch(/statut = \$3/);
        expect(update[1].slice(1, 4)).toEqual(['partial', 'partiel', false]);

        const setConfig = db.query.mock.calls.find((c) => String(c[0]).includes('set_config'))!;
        expect(setConfig[1]).toEqual(['3']);
    });

    it('échec de la quittance : l\'encaissement reste validé', async () => {
        (receiptService.generateReceipt as jest.Mock).mockRejectedValueOnce(new Error('PDF'));
        const db = fakeDb();

        const r = await FinanceService.paySchedule(db.client, '12', [3], {});

        expect(r.soldee).toBe(true);
        expect(r.receiptUrl).toBeNull();
        expect(sqlCalls(db.query)).toContain('COMMIT');
        expect(sqlCalls(db.query)).not.toContain('ROLLBACK');
    });
});
