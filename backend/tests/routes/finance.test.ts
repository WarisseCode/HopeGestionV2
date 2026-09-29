/**
 * Tests d'intégration — Routes finance (/api/finances)
 * Couvre : contrôle d'accès (401/403/200), pagination, filtres de base.
 * DB, permissions et tenantGuard sont mockés.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// tenantGuard : dbClient pointe vers le même pool mocké (via require pour éviter le hoist)
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default; // même mock que pool
            req.resolvedOwnerId = 1;
            next();
        },
    };
});

// permissionMiddleware : accorde toujours l'accès dans ce fichier
// (les tests d'accès refusé passent par un token sans le bon rôle)
jest.mock('../../middleware/permissionMiddleware', () => ({
    __esModule: true,
    default: {
        canRead:     (_m: string) => (_req: any, _res: any, next: any) => next(),
        canWrite:    (_m: string) => (_req: any, _res: any, next: any) => next(),
        canDelete:   (_m: string) => (_req: any, _res: any, next: any) => next(),
        canValidate: (_m: string) => (_req: any, _res: any, next: any) => next(),
    },
    checkPermission: (_m: string, _a: string) => (_req: any, _res: any, next: any) => next(),
    permissions: {
        canRead:     (_m: string) => (_req: any, _res: any, next: any) => next(),
        canWrite:    (_m: string) => (_req: any, _res: any, next: any) => next(),
        canDelete:   (_m: string) => (_req: any, _res: any, next: any) => next(),
        canValidate: (_m: string) => (_req: any, _res: any, next: any) => next(),
    },
}));

jest.mock('../../services/ReceiptService', () => ({
    receiptService: { generateReceipt: jest.fn() },
}));

// FinanceService mocké : la route ne fait plus de requête SQL elle-même, elle délègue
// au service (getPayments, paySchedule…). L'ancien mock n'exposait que
// `generateSchedules` (nom obsolète) → `getPayments is not a function` → 500.
// La logique SQL de paySchedule est testée directement dans
// tests/services/financeService.paySchedule.test.ts.
jest.mock('../../services/FinanceService', () => ({
    FinanceService: {
        getPayments: jest.fn(),
        createPayment: jest.fn(),
        paySchedule: jest.fn(),
        generateMonthlySchedules: jest.fn(),
    },
}));

jest.mock('exceljs', () => ({
    Workbook: jest.fn().mockImplementation(() => ({
        addWorksheet: jest.fn().mockReturnValue({
            columns: [],
            addRow: jest.fn(),
        }),
        xlsx: { write: jest.fn() },
    })),
}));

import pool from '../../db/database';
import { FinanceService } from '../../services/FinanceService';
import { protect } from '../../middleware/authMiddleware';
import financeRouter from '../../routes/financeRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/finances', protect, financeRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

const mockPaymentRows = [
    {
        id: 1, lease_id: 10, amount: 150000, payment_date: '2026-01-01',
        payment_method: 'cash', statut: 'payé', type: 'loyer',
        locataire_nom: 'Kodjovi', locataire_prenoms: 'Eric',
        proprietaire_nom: 'Dupont', reference_bail: 'BAIL-001', loyer_mensuel: 150000,
        quittance_url: '/uploads/receipts/quittance_202601-1.pdf',
    },
];

// ── Tests : contrôle d'accès ──────────────────────────────────────────────────

describe('GET /api/finances — contrôle d\'accès', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie 401 sans token', async () => {
        const res = await request(app).get('/api/finances');
        expect(res.status).toBe(401);
    });

    it('renvoie 200 avec un token gestionnaire valide', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }); // authMiddleware SELECT email
        (FinanceService.getPayments as jest.Mock).mockResolvedValueOnce(mockPaymentRows);

        const res = await request(app)
            .get('/api/finances')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('payments');
    });
});

// ── Tests : structure de la réponse ──────────────────────────────────────────

describe('GET /api/finances — structure de la réponse', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie { payments: [...] } avec les paiements', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });
        (FinanceService.getPayments as jest.Mock).mockResolvedValueOnce(mockPaymentRows);

        const res = await request(app)
            .get('/api/finances')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.payments)).toBe(true);
        expect(res.body.payments).toHaveLength(1);
        expect(res.body.payments[0]).toHaveProperty('amount', 150000);
        // quittance_url transmis tel quel (route en pur passe-plat) — voir aussi
        // financeService.getPayments.test.ts pour la présence de la colonne en SQL.
        expect(res.body.payments[0]).toHaveProperty(
            'quittance_url', '/uploads/receipts/quittance_202601-1.pdf'
        );
        // Filtre propriétaire transmis au service (resolvedOwnerId = 1 dans le mock tenantGuard).
        expect(FinanceService.getPayments).toHaveBeenCalledWith(expect.anything(), [1], expect.any(Object));
    });

    it('renvoie { payments: [] } si aucun paiement', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });
        (FinanceService.getPayments as jest.Mock).mockResolvedValueOnce([]);

        const res = await request(app)
            .get('/api/finances')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.payments).toHaveLength(0);
    });
});

// ── Tests : création d'un paiement ───────────────────────────────────────────

describe('POST /api/finances — création', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie 401 sans token', async () => {
        const res = await request(app).post('/api/finances').send({});
        expect(res.status).toBe(401);
    });

    it('renvoie 400 si champs requis manquants', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }) // authMiddleware
            .mockResolvedValueOnce({ rows: [] });                           // BEGIN transaction

        const res = await request(app)
            .post('/api/finances')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({}); // body vide — déclenche le 400 avant toute query métier

        expect(res.status).toBe(400);
    });
});

// ── Tests : encaissement d'une échéance (route) ──────────────────────────────

describe('PUT /api/finances/schedules/:id/pay — route', () => {
    beforeEach(() => jest.clearAllMocks());

    const pay = (body: Record<string, unknown>, id = 12) => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });
        return request(app)
            .put(`/api/finances/schedules/${id}/pay`)
            .set('Authorization', `Bearer ${authToken()}`)
            .send(body);
    };

    it('transmet au service les champs du web (payment_method, reference)', async () => {
        (FinanceService.paySchedule as jest.Mock).mockResolvedValueOnce({
            schedule: { id: 12, status: 'paid' }, receiptUrl: '/uploads/receipts/q.pdf',
            payment: { id: 99, montant: 185000 }, reste_du: 0, soldee: true,
        });

        const res = await pay({ payment_method: 'mobile_money', reference: 'MM-123' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Échéance marquée comme payée');
        expect(res.body.receiptUrl).toBe('/uploads/receipts/q.pdf');
        expect(FinanceService.paySchedule).toHaveBeenCalledWith(
            expect.anything(), '12', [1],
            expect.objectContaining({ payment_method: 'mobile_money', reference: 'MM-123' }),
        );
    });

    it('acompte : message dédié, reste dû renvoyé', async () => {
        (FinanceService.paySchedule as jest.Mock).mockResolvedValueOnce({
            schedule: { id: 12, status: 'partial' }, receiptUrl: null,
            payment: { id: 98, montant: 50000 }, reste_du: 135000, soldee: false,
        });

        const res = await pay({ montant: 50000, mode_paiement: 'especes' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Acompte enregistré');
        expect(res.body.reste_du).toBe(135000);
        expect(res.body.receiptUrl).toBeNull();
    });

    it('échéance déjà soldée : le 409 du service est propagé', async () => {
        (FinanceService.paySchedule as jest.Mock).mockRejectedValueOnce(
            Object.assign(new Error('Échéance déjà soldée'), { statusCode: 409 }),
        );

        const res = await pay({});

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('Échéance déjà soldée');
    });

    it('montant négatif ou nul : 400 dès la validation, service non appelé', async () => {
        const res = await pay({ montant: 0 });

        expect(res.status).toBe(400);
        expect(FinanceService.paySchedule).not.toHaveBeenCalled();
    });

    it('date invalide : 400 dès la validation', async () => {
        const res = await pay({ date_paiement: 'pas-une-date' });

        expect(res.status).toBe(400);
        expect(FinanceService.paySchedule).not.toHaveBeenCalled();
    });
});
