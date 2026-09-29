/**
 * Tests d'intégration — Correctif de sécurité IDOR sur l'échéancier d'un bail
 * (GET /api/locations/:id/echeancier et la partie échéancier de GET /:id).
 *
 * `payment_schedules` n'a pas de politique RLS : avant ce correctif, l'échéancier
 * d'un bail appartenant à un autre propriétaire était lisible en devinant son id.
 * Le correctif vérifie d'abord l'accès au bail via la requête déjà protégée par
 * la RLS de `leases` (dbClient) et renvoie 404 sinon, sans jamais lire
 * `payment_schedules`.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// tenantGuard : dbClient pointe vers le même pool mocké (même pattern que
// finance.test.ts/bien.test.ts) — les appels de la route et de `protect`
// partagent donc la même file de réponses mockées, dans l'ordre d'exécution.
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default;
            req.resolvedOwnerId = 1;
            next();
        },
    };
});

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

import pool from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import leaseRoutes from '../../routes/leaseRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/locations', protect, leaseRoutes);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

/** `protect` fait toujours un premier SELECT email avant que la route ne s'exécute. */
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const scheduleRows = [
    { id: 1, lease_id: 42, total_amount: '150000', amount_paid: '0', status: 'pending', statut: 'en_attente' },
];

const leaseDetailRow = {
    id: 42, loyer_actuel: 150000, tenant_id: 5, lot_id: 9,
};

describe('GET /api/locations/:id/echeancier — accès propriétaire', () => {
    beforeEach(() => jest.clearAllMocks());

    it("bail d'un autre propriétaire (invisible via la RLS de leases) → 404, sans lire payment_schedules", async () => {
        mockAuthLookup();
        // leaseCheck : la RLS de `leases` ne renvoie aucune ligne pour ce bail.
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/locations/42/echeancier')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');

        // Un seul appel après l'auth : le leaseCheck. payment_schedules n'a jamais été interrogé.
        const calls = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
        expect(calls.some((sql) => sql.includes('FROM payment_schedules'))).toBe(false);
    });

    it('bail visible pour ce propriétaire → réponse inchangée (échéancier renvoyé)', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42 }] }); // leaseCheck OK
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: scheduleRows }); // payment_schedules

        const res = await request(app)
            .get('/api/locations/42/echeancier')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ echeancier: scheduleRows });
    });
});

describe('GET /api/locations/:id — échéancier inclus dans la fiche du bail', () => {
    beforeEach(() => jest.clearAllMocks());

    it("bail d'un autre propriétaire → 404, sans lire payment_schedules", async () => {
        mockAuthLookup();
        // La requête `leases` (déjà protégée par la RLS) ne renvoie aucune ligne.
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/locations/42')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(404);

        const calls = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
        expect(calls.some((sql) => sql.includes('FROM payment_schedules'))).toBe(false);
    });

    it('bail visible → réponse inchangée (location + echeancier)', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [leaseDetailRow] });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: scheduleRows });

        const res = await request(app)
            .get('/api/locations/42')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ location: leaseDetailRow, echeancier: scheduleRows });
    });
});
