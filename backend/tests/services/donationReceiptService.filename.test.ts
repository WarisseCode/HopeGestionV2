/**
 * Test unitaire ciblé — DonationReceiptService : nom de fichier du reçu.
 *
 * `don_<receiptNumber>_<suffixe>.pdf` est servi sans authentification (`/uploads`
 * en statique) : le suffixe doit être un jeton aléatoire cryptographique, pas
 * Date.now() (devinable). La génération PDF elle-même (mise en page) n'est pas
 * testée ici — `createPDF` est mocké pour ne pas écrire de vrai fichier.
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn() },
}));

import pool from '../../db/database';
import { donationReceiptService } from '../../services/DonationReceiptService';

const donationRow = {
    id: 7,
    donor_name: 'Amoussou Kossi',
    donor_email: 'kossi@example.com',
    donor_phone: '+22890000000',
    amount: '25000.00',
    currency: 'XOF',
    description: 'Don libre',
    fedapay_transaction_id: 'txn_123',
    paid_at: '2026-09-15T10:00:00.000Z',
    created_at: '2026-09-15T09:00:00.000Z',
};

describe('DonationReceiptService — nom de fichier (jeton aléatoire, pas de timestamp devinable)', () => {
    it('generateReceipt produit une URL avec un jeton hexadécimal de 32 caractères, pas Date.now()', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [donationRow] }) // getReceiptData
            .mockResolvedValueOnce({ rows: [] });            // UPDATE donations SET receipt_url

        jest.spyOn(donationReceiptService as any, 'createPDF').mockResolvedValue(undefined);

        const url = await donationReceiptService.generateReceipt(7);

        expect(url).toMatch(/^\/uploads\/donation-receipts\/don_.+_[0-9a-f]{32}\.pdf$/);

        const [updateSql, updateParams] = (pool.query as jest.Mock).mock.calls[1];
        expect(String(updateSql)).toMatch(/UPDATE donations SET receipt_url/);
        expect(updateParams[0]).toBe(url);
    });
});
