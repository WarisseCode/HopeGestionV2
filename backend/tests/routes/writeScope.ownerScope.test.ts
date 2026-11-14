/**
 * Tests — filtre propriétaire sur les ÉCRITURES (audit 2026-11-14, constat S2).
 *
 * La lecture de ces modules était déjà filtrée (rlsOnly.ownerScope.test.ts) mais
 * les modifications/suppressions ciblaient `WHERE id = $n` seul : un gestionnaire
 * pouvait agir sur les données d'une autre agence en changeant l'identifiant.
 *
 * Routes couvertes :
 *  - PUT/DELETE /api/providers/:id
 *  - PUT/DELETE /api/service-contracts/:id
 *  - GET/DELETE /api/expenses(/:id)
 *  - PUT /api/tickets/:id, POST /:id/reschedule, POST /:id/close
 *
 * DB mockée : on vérifie le SQL construit (clause + paramètres) et les statuts.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

let mockValidOwnerIds: number[] = [1];
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default;
            req.resolvedOwnerId = mockValidOwnerIds.length === 1 ? mockValidOwnerIds[0] : null;
            req.validOwnerIds   = mockValidOwnerIds;
            next();
        },
    };
});

jest.mock('../../middleware/permissionMiddleware', () => {
    const pass = (_m: string) => (_req: any, _res: any, next: any) => next();
    const perms = { canRead: pass, canWrite: pass, canDelete: pass, canValidate: pass };
    return {
        __esModule: true,
        default: perms,
        permissions: perms,
        checkPermission: (_m: string, _a: string) => (_req: any, _res: any, next: any) => next(),
    };
});

import pool from '../../db/database';
import providerRoutes from '../../routes/providerRoutes';
import serviceContractRoutes from '../../routes/serviceContractRoutes';
import expenseRoutes from '../../routes/expenseRoutes';
import ticketRoutes from '../../routes/ticketRoutes';

const app = express();
app.use(express.json());
app.use('/api/providers', providerRoutes);
app.use('/api/service-contracts', serviceContractRoutes);
app.use('/api/expenses', expenseRoutes); // protect déjà appliqué dans le routeur
app.use('/api/tickets', ticketRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

/** Dernier appel DB (la requête métier, après le lookup d'auth de `protect`). */
const lastCall = () => {
    const calls = (pool.query as jest.Mock).mock.calls;
    return calls[calls.length - 1];
};

type Method = 'put' | 'post' | 'delete' | 'get';
const send = (method: Method, url: string, body: any = {}, role = 'gestionnaire') =>
    request(app)[method](url).set('Authorization', `Bearer ${authToken(role)}`).send(body);

beforeEach(() => {
    jest.clearAllMocks();
    mockValidOwnerIds = [1];
});

// Chaque cas : [méthode, url, corps, fragment SQL attendu]
const writeCases: [Method, string, any, string][] = [
    ['put',    '/api/providers/7',              { name: 'Plombier' }, 'UPDATE providers'],
    ['delete', '/api/providers/7',              {},                   'DELETE FROM providers'],
    ['put',    '/api/service-contracts/7',      { title: 'Ménage' },  'UPDATE service_contracts'],
    ['delete', '/api/service-contracts/7',      {},                   'DELETE FROM service_contracts'],
    ['delete', '/api/expenses/7',               {},                   'DELETE FROM expenses'],
    ['put',    '/api/tickets/7',                { statut: 'En cours' }, 'UPDATE tickets'],
    ['put',    '/api/tickets/7',                { provider_id: 3, statut: 'En cours' }, 'UPDATE tickets SET provider_id'],
    ['post',   '/api/tickets/7/reschedule',     { new_date: '2026-12-01' }, 'scheduled_date'],
    ['post',   '/api/tickets/7/close',          { cost_real: 1000 },  "statut='Clos'"],
];

describe.each(writeCases)('%s %s', (method, url, body, sqlFragment) => {
    it('gestionnaire : la requête est filtrée sur ses propriétaires', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 7 }] });

        const res = await send(method, url, body);

        expect(res.status).toBe(200);
        const [sql, params] = lastCall();
        expect(sql).toContain(sqlFragment);
        expect(sql).toMatch(/owner_id = ANY\(\$\d+::int\[\]\)/);
        expect(params[params.length - 1]).toEqual([1, 2]);
    });

    it("élément d'une autre agence (0 ligne) → 404", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await send(method, url, body);

        expect(res.status).toBe(404);
    });

    it('admin : aucune clause owner_id', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 7 }] });

        const res = await send(method, url, body, 'admin');

        expect(res.status).toBe(200);
        const [sql] = lastCall();
        expect(sql).not.toContain('owner_id = ANY');
    });
});

describe('GET /api/expenses', () => {
    it('gestionnaire : filtré sur ses propriétaires, avec repli sur l\'immeuble si owner_id NULL', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await send('get', '/api/expenses?category=eau');

        expect(res.status).toBe(200);
        const [sql, params] = lastCall();
        expect(sql).toContain('e.owner_id = ANY($1::int[])');
        expect(sql).toContain('e.owner_id IS NULL AND EXISTS');
        // Les filtres optionnels suivent le filtre propriétaire ($2…)
        expect(sql).toContain('e.category = $2');
        expect(params).toEqual([[1, 2], 'eau']);
    });

    it('admin : non filtré', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await send('get', '/api/expenses?category=eau', {}, 'admin');

        expect(res.status).toBe(200);
        const [sql, params] = lastCall();
        expect(sql).not.toContain('owner_id = ANY');
        expect(sql).toContain('e.category = $1');
        expect(params).toEqual(['eau']);
    });
});
