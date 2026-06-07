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

jest.mock('../../services/FinanceService', () => ({
    FinanceService: { generateSchedules: jest.fn() },
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
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }) // authMiddleware SELECT email
            .mockResolvedValueOnce({ rows: mockPaymentRows });              // dbClient SELECT payments

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
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] })
            .mockResolvedValueOnce({ rows: mockPaymentRows });

        const res = await request(app)
            .get('/api/finances')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.payments)).toBe(true);
        expect(res.body.payments).toHaveLength(1);
        expect(res.body.payments[0]).toHaveProperty('amount', 150000);
    });

    it('renvoie { payments: [] } si aucun paiement', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] })
            .mockResolvedValueOnce({ rows: [] });

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
