/**
 * Tests unitaires — FinanceService.getPayments : présence de `quittance_url`.
 *
 * `getPayments` renvoie `result.rows` tel quel (aucune transformation) : le test
 * important est que le SQL sélectionne bien la colonne, pas la logique applicative
 * (triviale). dbClient simulé, comme `financeService.paySchedule.test.ts`.
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import { FinanceService } from '../../services/FinanceService';

describe('FinanceService.getPayments', () => {
    it('sélectionne p.quittance_url', async () => {
        const query = jest.fn().mockResolvedValue({ rows: [] });
        const dbClient = { query } as any;

        await FinanceService.getPayments(dbClient, [1], {});

        const sql = String(query.mock.calls[0][0]);
        expect(sql).toMatch(/p\.quittance_url\b/);
    });

    it('transmet quittance_url reçu de la base sans le modifier', async () => {
        const row = {
            id: 1, amount: '150000.00', payment_date: '2026-01-01',
            quittance_url: '/uploads/receipts/quittance_202601-1.pdf',
        };
        const query = jest.fn().mockResolvedValue({ rows: [row] });
        const dbClient = { query } as any;

        const rows = await FinanceService.getPayments(dbClient, [1], {});

        expect(rows[0].quittance_url).toBe('/uploads/receipts/quittance_202601-1.pdf');
    });

    it('quittance_url absent (paiement non soldé) : reste tel quel (null/undefined)', async () => {
        const row = { id: 2, amount: '50000.00', payment_date: '2026-01-01', quittance_url: null };
        const query = jest.fn().mockResolvedValue({ rows: [row] });
        const dbClient = { query } as any;

        const rows = await FinanceService.getPayments(dbClient, [1], {});

        expect(rows[0].quittance_url).toBeNull();
    });
});
