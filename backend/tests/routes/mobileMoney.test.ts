/**
 * Tests d'intégration — Correctif faille #1 (audit RLS T-011)
 * GET /api/mobile-money/transactions : mobile_money_transactions n'a pas de policy
 * RLS forcée -> isolation applicative explicite par owner_id, requise ici.
 * POST /api/mobile-money/pay : owner_id désormais obligatoire à l'écriture.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

let mockValidOwnerIds: number[] = [];
let mockResolvedOwnerId: number | null = 1;

// tenantGuard mocké : dbClient pointe vers le même pool mocké (même pattern que finance.test.ts)
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient = poolModule.default;
            req.validOwnerIds = mockValidOwnerIds;
            req.resolvedOwnerId = mockResolvedOwnerId;
            next();
        },
    };
});

jest.mock('../../services/mobileMoneyService', () => ({
    mobileMoneyService: {
        requestPayment: jest.fn().mockResolvedValue({
            success: true, message: 'ok', transactionId: 'MTN_123', status: 'success',
        }),
        getConfigs: jest.fn(), addConfig: jest.fn(), updateConfig: jest.fn(),
        deleteConfig: jest.fn(), toggleConfigStatus: jest.fn(),
    },
}));

import pool from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import mobileMoneyRouter from '../../routes/mobileMoneyRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/mobile-money', protect, mobileMoneyRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

// email fourni dans le payload pour que authMiddleware saute le SELECT de secours
// (sinon il faudrait mocker un premier appel pool.query pour chaque test)
const authToken = (role = 'gestionnaire', id = 1) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

// ── GET /transactions ────────────────────────────────────────────────────────

describe('GET /api/mobile-money/transactions — isolation par owner_id', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidOwnerIds = [1];
        mockResolvedOwnerId = 1;
    });

    it("gestionnaire de l'agence A : reçoit ses transactions, filtrées par ses owners", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 1, amount: 5000, owner_id: 1 }],
        });

        const res = await request(app)
            .get('/api/mobile-money/transactions')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, amount: 5000, owner_id: 1 }]);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE owner_id = ANY($1::int[])'),
            [[1]],
        );
    });

    it("gestionnaire sans owner lié (autre agence) : tableau vide, aucune requête déclenchée", async () => {
        mockValidOwnerIds = [];

        const res = await request(app)
            .get('/api/mobile-money/transactions')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('admin : accès non filtré (toutes agences)', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 1, owner_id: 1 }, { id: 2, owner_id: 2 }],
        });

        const res = await request(app)
            .get('/api/mobile-money/transactions')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        const calledSql = (pool.query as jest.Mock).mock.calls[0][0] as string;
        expect(calledSql).not.toContain('WHERE');
    });
});

// ── POST /pay ────────────────────────────────────────────────────────────────

describe('POST /api/mobile-money/pay — owner_id obligatoire', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidOwnerIds = [1];
        mockResolvedOwnerId = 1;
    });

    it("owner résolu : la transaction est créée avec owner_id dans l'INSERT", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: 10, transaction_id: null }] }) // INSERT
            .mockResolvedValueOnce({ rows: [] }); // UPDATE status

        const res = await request(app)
            .post('/api/mobile-money/pay')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`)
            .send({ amount: 5000, phoneNumber: '+22990000000', operator: 'MTN' });

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('INSERT INTO mobile_money_transactions'),
            [5000, '+22990000000', 'MTN', undefined, 1],
        );
    });

    it('owner non résolu (multi-owner ambigu, pas de X-Owner-Id) : 400, aucune transaction créée', async () => {
        mockResolvedOwnerId = null;

        const res = await request(app)
            .post('/api/mobile-money/pay')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`)
            .send({ amount: 5000, phoneNumber: '+22990000000', operator: 'MTN' });

        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('admin sans owner résolu : refusé aussi (owner_id reste obligatoire, même pour admin)', async () => {
        mockResolvedOwnerId = null;

        const res = await request(app)
            .post('/api/mobile-money/pay')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send({ amount: 5000, phoneNumber: '+22990000000', operator: 'MTN' });

        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });
});
