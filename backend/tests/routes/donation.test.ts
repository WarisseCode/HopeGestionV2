/**
 * Tests — Module Dons de soutien (donationRoutes.ts)
 * Couvre : création (super-admin uniquement), webhook FedaPay avec
 * re-vérification obligatoire (jamais confiance aveugle au payload —
 * inclut un cas de fraude explicite), listing/détail.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/fedapayService', () => ({
    __esModule: true,
    fedapayService: {
        createPaymentTransaction: jest.fn(),
        getTransactionStatus: jest.fn(),
    },
}));

jest.mock('../../services/DonationReceiptService', () => ({
    __esModule: true,
    donationReceiptService: {
        generateReceipt: jest.fn().mockResolvedValue('/uploads/donation-receipts/don_x.pdf'),
    },
}));

import pool from '../../db/database';
import { fedapayService } from '../../services/fedapayService';
import { donationReceiptService } from '../../services/DonationReceiptService';
import donationRouter from '../../routes/donationRoutes';

// ── App de test (montage identique à index.ts : SANS `protect` global) ────────

const app = express();
app.use(express.json());
app.use('/api/donations', donationRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'admin', id = 1) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

let mockClient: { query: jest.Mock; release: jest.Mock };

beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
});

// ── POST /api/donations ─────────────────────────────────────────────────────

describe('POST /api/donations — création (super-admin)', () => {
    const validBody = {
        donorName: 'Fondation Exemple',
        donorEmail: 'contact@fondation-exemple.org',
        donorPhone: '+22990001122',
        amount: 50000,
        operator: 'mtn',
        description: 'Don de soutien annuel',
    };

    it('admin : crée le don (pending) + la transaction FedaPay, renvoie la paymentUrl', async () => {
        mockClient.query.mockImplementation((sql: string) => {
            if (sql.includes('INSERT INTO donations')) {
                return Promise.resolve({ rows: [{ id: 55 }] });
            }
            return Promise.resolve({ rows: [] }); // BEGIN, UPDATE, COMMIT
        });
        (fedapayService.createPaymentTransaction as jest.Mock).mockResolvedValue({
            success: true,
            transactionId: 'FEDA_123',
            paymentUrl: 'https://checkout.fedapay.com/FEDA_123',
            status: 'pending',
        });

        const res = await request(app)
            .post('/api/donations')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.donation.id).toBe(55);
        expect(res.body.paymentUrl).toBe('https://checkout.fedapay.com/FEDA_123');

        // Le don est bien créé sans FK utilisateur pour le donateur.
        const insertCall = mockClient.query.mock.calls.find((c) => c[0].includes('INSERT INTO donations'));
        expect(insertCall[1]).toEqual(['Fondation Exemple', 'contact@fondation-exemple.org', '+22990001122', 50000, 'Don de soutien annuel', 1]);

        // La transaction FedaPay est créée avec le discriminant plan_type: 'donation'.
        const fedaCall = (fedapayService.createPaymentTransaction as jest.Mock).mock.calls[0][0];
        expect(fedaCall.plan.planType).toBe('donation');
        expect(fedaCall.plan.planId).toBe(55);
        expect(fedaCall.operator).toBe('mtn');

        // La référence FedaPay est bien persistée après coup.
        const updateCall = mockClient.query.mock.calls.find((c) => c[0].includes('UPDATE donations SET fedapay_transaction_id'));
        expect(updateCall[1]).toEqual(['FEDA_123', 'https://checkout.fedapay.com/FEDA_123', 55]);
    });

    it('rôle non-admin (gestionnaire) : 403, aucune écriture', async () => {
        const res = await request(app)
            .post('/api/donations')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`)
            .send(validBody);

        expect(res.status).toBe(403);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    it('sans token : 401', async () => {
        const res = await request(app).post('/api/donations').send(validBody);
        expect(res.status).toBe(401);
    });

    it('donorName manquant : 400 de validation', async () => {
        const res = await request(app)
            .post('/api/donations')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send({ ...validBody, donorName: '' });

        expect(res.status).toBe(400);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    it('échec FedaPay : ROLLBACK, 400, pas de mise à jour de la référence', async () => {
        mockClient.query.mockImplementation((sql: string) => {
            if (sql.includes('INSERT INTO donations')) {
                return Promise.resolve({ rows: [{ id: 56 }] });
            }
            return Promise.resolve({ rows: [] });
        });
        (fedapayService.createPaymentTransaction as jest.Mock).mockResolvedValue({
            success: false,
            message: 'Configuration FedaPay manquante',
            transactionId: null,
            paymentUrl: null,
            status: 'error',
        });

        const res = await request(app)
            .post('/api/donations')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send(validBody);

        expect(res.status).toBe(400);
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        const updateCall = mockClient.query.mock.calls.find((c) => c[0].includes('UPDATE donations SET fedapay_transaction_id'));
        expect(updateCall).toBeUndefined();
    });
});

// ── POST /api/donations/webhook ─────────────────────────────────────────────

describe('POST /api/donations/webhook — re-vérification obligatoire', () => {
    const approvedPayload = {
        entity: 'transaction',
        name: 'transaction.approved',
        object: {
            id: 999,
            status: 'approved',
            custom_metadata: { plan_type: 'donation', plan_id: '55' },
        },
    };

    it('événement non-donation (plan_type absent/différent) : ignoré, aucun accès DB', async () => {
        const res = await request(app)
            .post('/api/donations/webhook')
            .send({ ...approvedPayload, object: { ...approvedPayload.object, custom_metadata: { plan_type: 'rent' } } });

        expect(res.status).toBe(200);
        expect(res.body.ignored).toBe(true);
        expect(pool.query).not.toHaveBeenCalled();
        expect(fedapayService.getTransactionStatus).not.toHaveBeenCalled();
    });

    it('don approuvé, statut confirmé par FedaPay : passe à approved + génère le reçu', async () => {
        (fedapayService.getTransactionStatus as jest.Mock).mockResolvedValue({ status: 'approved' });
        (pool.query as jest.Mock).mockImplementation((sql: string) => {
            if (sql.includes('SELECT status FROM donations')) {
                return Promise.resolve({ rows: [{ status: 'pending' }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const res = await request(app).post('/api/donations/webhook').send(approvedPayload);

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        const updateCall = (pool.query as jest.Mock).mock.calls.find((c) => c[0].includes("SET status = 'approved'"));
        expect(updateCall[1]).toEqual(['999', 55]);
        expect(donationReceiptService.generateReceipt).toHaveBeenCalledWith(55);
    });

    it(
        'CAS DE FRAUDE : payload prétend "approved" mais FedaPay confirme "declined" → ignoré, ' +
            'aucune mise à jour, aucun reçu généré',
        async () => {
            (fedapayService.getTransactionStatus as jest.Mock).mockResolvedValue({ status: 'declined' });

            const res = await request(app).post('/api/donations/webhook').send(approvedPayload);

            expect(res.status).toBe(200);
            expect(res.body.ignored).toBe(true);
            expect(res.body.reason).toBe('status_mismatch');
            // La discordance est détectée avant toute lecture/écriture en base.
            expect(pool.query).not.toHaveBeenCalled();
            expect(donationReceiptService.generateReceipt).not.toHaveBeenCalled();
        },
    );

    it('transaction invérifiable auprès de FedaPay (erreur API) : ignoré, aucune écriture', async () => {
        (fedapayService.getTransactionStatus as jest.Mock).mockResolvedValue({ status: 'error', error: 'Timeout' });

        const res = await request(app).post('/api/donations/webhook').send(approvedPayload);

        expect(res.status).toBe(200);
        expect(res.body.reason).toBe('unverifiable');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('idempotence : don déjà approuvé, ré-émission du webhook approved → aucune ré-écriture ni double reçu', async () => {
        (fedapayService.getTransactionStatus as jest.Mock).mockResolvedValue({ status: 'approved' });
        (pool.query as jest.Mock).mockImplementation((sql: string) => {
            if (sql.includes('SELECT status FROM donations')) {
                return Promise.resolve({ rows: [{ status: 'approved' }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const res = await request(app).post('/api/donations/webhook').send(approvedPayload);

        expect(res.status).toBe(200);
        expect(res.body.idempotent).toBe(true);
        expect(donationReceiptService.generateReceipt).not.toHaveBeenCalled();
        const updateCall = (pool.query as jest.Mock).mock.calls.find((c) => c[0].includes("SET status = 'approved'"));
        expect(updateCall).toBeUndefined();
    });

    it('don introuvable en base : ignoré proprement (pas de crash)', async () => {
        (fedapayService.getTransactionStatus as jest.Mock).mockResolvedValue({ status: 'approved' });
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const res = await request(app).post('/api/donations/webhook').send(approvedPayload);

        expect(res.status).toBe(200);
        expect(res.body.reason).toBe('donation_not_found');
    });
});

// ── GET /api/donations ───────────────────────────────────────────────────────

describe('GET /api/donations — liste (super-admin)', () => {
    it('rôle non-admin : 403', async () => {
        const res = await request(app)
            .get('/api/donations')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`);

        expect(res.status).toBe(403);
    });

    it('admin : liste filtrée par statut', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1, status: 'approved' }] });

        const res = await request(app)
            .get('/api/donations?status=approved')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        expect(res.body.donations).toEqual([{ id: 1, status: 'approved' }]);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE status = $1'),
            ['approved'],
        );
    });
});

// ── GET /api/donations/:id ───────────────────────────────────────────────────

describe('GET /api/donations/:id — détail (super-admin)', () => {
    it('don introuvable : 404', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const res = await request(app)
            .get('/api/donations/999')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(404);
    });

    it('don trouvé : 200 + détail complet', async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1, donor_name: 'Fondation Exemple' }] });

        const res = await request(app)
            .get('/api/donations/1')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        expect(res.body.donation.donor_name).toBe('Fondation Exemple');
    });
});
