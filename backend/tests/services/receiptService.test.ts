/**
 * Tests unitaires — ReceiptService : montant de la quittance.
 *
 * Échéance soldée → total de l'échéance + mention des versements ; paiement sans
 * échéance ou échéance non soldée → montant du paiement seul (inchangé).
 * La génération PDF elle-même (mise en page) n'est pas testée, mais le nom de
 * fichier produit par `generateReceipt` l'est (voir describe dédié) : ces fichiers
 * sont servis sans authentification (`/uploads`), leur nom doit donc être un jeton
 * aléatoire, pas un timestamp devinable (Date.now()).
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn() },
}));

import pool from '../../db/database';
import { receiptService } from '../../services/ReceiptService';

/** Ligne SQL de getReceiptData : échéance de 185 000 soldée par 50 000 puis 135 000. */
function row(overrides: Record<string, unknown> = {}) {
    return {
        payment_id: 101,
        montant: '135000.00',
        date_paiement: '2026-09-15T12:00:00.000Z',
        mode_paiement: 'especes',
        reference_transaction: null,
        period_description: 'Loyer 9/2026',
        due_date: '2026-09-05T12:00:00.000Z',
        schedule_id: 12,
        schedule_total: '185000.00',
        schedule_paid: '185000.00',
        schedule_status: 'paid',
        schedule_statut: 'paye',
        schedule_payments_count: '2', // COUNT(*) → bigint → chaîne
        lease_id: 8,
        monthly_rent: '185000.00',
        lease_start: '2026-01-01T12:00:00.000Z',
        tenant_last_name: 'Dossou',
        tenant_first_name: 'Afi',
        tenant_address: null,
        building_name: 'Résidence A',
        building_address: 'Cotonou',
        lot_number: 'A1',
        lot_type: 'appartement',
        owner_name: 'Propriétaire',
        owner_address: 'Adresse du propriétaire',
        user_plan_name: 'pro',
        ...overrides,
    };
}

const loyer = (rows: [string, string][]) => rows.find(([label]) => label === 'Loyer Principal')![1];
const modalite = (rows: [string, string][]) => rows.find(([label]) => label === 'Modalité de règlement');

describe('ReceiptService — montant de la quittance', () => {
    it('échéance soldée en 2 versements : total de l\'échéance + « Réglé en 2 versements »', () => {
        const data = receiptService.buildReceiptData(row(), 101);

        expect(data.payment.amount).toBe(185000);
        expect(data.payment.installments).toBe(2);

        const rows = receiptService.paymentRows(data);
        expect(loyer(rows)).toMatch(/185 000/);
        expect(modalite(rows)).toEqual(['Modalité de règlement', 'Réglé en 2 versements']);
    });

    it('échéance soldée en un seul versement : total, sans mention', () => {
        const data = receiptService.buildReceiptData(
            row({ montant: '185000.00', schedule_payments_count: '1' }), 101);

        expect(data.payment.amount).toBe(185000);
        expect(data.payment.installments).toBe(1);
        expect(modalite(receiptService.paymentRows(data))).toBeUndefined();
    });

    it.each([
        ['status = paid seul', { schedule_statut: 'en_attente', schedule_paid: '0.00' }],
        ['statut = paye seul (POST /api/paiements)', { schedule_status: 'pending', schedule_paid: '0.00' }],
        ['amount_paid >= total seul', { schedule_status: 'pending', schedule_statut: 'en_attente' }],
    ])('soldée selon la règle à deux colonnes : %s', (_label, overrides) => {
        expect(receiptService.buildReceiptData(row(overrides), 101).payment.amount).toBe(185000);
    });

    it('échéance non soldée (acompte, ex. paiement en ligne partiel) : montant du paiement seul', () => {
        const data = receiptService.buildReceiptData(row({
            montant: '50000.00',
            schedule_paid: '50000.00',
            schedule_status: 'partial',
            schedule_statut: 'partiel',
            schedule_payments_count: '1',
        }), 101);

        expect(data.payment.amount).toBe(50000);
        expect(data.payment.installments).toBe(1);
        expect(modalite(receiptService.paymentRows(data))).toBeUndefined();
    });

    it('paiement sans échéance : montant du paiement, inchangé', () => {
        const data = receiptService.buildReceiptData(row({
            montant: '90000.00',
            schedule_id: null,
            schedule_total: null,
            schedule_paid: null,
            schedule_status: null,
            schedule_statut: null,
            schedule_payments_count: '0',
        }), 101);

        expect(data.payment.amount).toBe(90000);
        expect(data.payment.installments).toBe(1);
        expect(loyer(receiptService.paymentRows(data))).toMatch(/90 000/);
        expect(modalite(receiptService.paymentRows(data))).toBeUndefined();
    });

    it('la requête lit le total de l\'échéance et compte ses paiements valides', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row()] });

        const data = await (receiptService as any).getReceiptData(101);

        const sql = String((pool.query as jest.Mock).mock.calls[0][0]);
        expect(sql).toMatch(/ps\.total_amount as schedule_total/);
        expect(sql).toMatch(/COUNT\(\*\) FROM payments p2\s+WHERE p2\.schedule_id = ps\.id/);
        expect(sql).toMatch(/COALESCE\(p2\.statut, 'valide'\) = 'valide'/);
        expect(data.payment.amount).toBe(185000);
        expect(data.payment.installments).toBe(2);
    });
});

describe('ReceiptService — nom de fichier (jeton aléatoire, pas de timestamp devinable)', () => {
    it("generateReceipt produit une URL avec un jeton hexadécimal de 32 caractères, pas Date.now()", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [row()] }) // getReceiptData
            .mockResolvedValueOnce({ rows: [] });      // UPDATE payments SET quittance_url

        // La génération PDF réelle (mise en page, écriture disque) n'est pas
        // l'objet de ce test : seul le nom de fichier produit nous intéresse ici.
        jest.spyOn(receiptService as any, 'createPDF').mockResolvedValue(undefined);

        const url = await receiptService.generateReceipt(101);

        expect(url).toMatch(/^\/uploads\/receipts\/quittance_.+_[0-9a-f]{32}\.pdf$/);

        // Dernier appel = l'UPDATE (ce fichier ne réinitialise pas les mocks entre
        // tests ; `mock.calls` peut donc déjà contenir des appels des tests précédents).
        const calls = (pool.query as jest.Mock).mock.calls;
        const [updateSql, updateParams] = calls[calls.length - 1];
        expect(String(updateSql)).toMatch(/UPDATE payments SET quittance_url/);
        expect(updateParams[0]).toBe(url);
    });
});
