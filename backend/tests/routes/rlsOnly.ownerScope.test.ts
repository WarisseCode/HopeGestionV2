/**
 * Tests — routes qui ne filtraient que par RLS (aucun filtre applicatif).
 *
 * depenseRoutes (GET /, /stats, /history), providerRoutes (GET /),
 * serviceContractRoutes (GET /), tenantAccessRoutes (GET /:tenantId).
 * Convention du projet : ne jamais se fier uniquement à la RLS (le rôle DB peut
 * avoir BYPASSRLS). Ajout d'un scopeByOwner local filtrant sur validOwnerIds,
 * contourné pour admin.
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
import { protect } from '../../middleware/authMiddleware';
import depenseRoutes from '../../routes/depenseRoutes';
import providerRoutes from '../../routes/providerRoutes';
import serviceContractRoutes from '../../routes/serviceContractRoutes';
import tenantAccessRoutes from '../../routes/tenantAccessRoutes';

const app = express();
app.use(express.json());
app.use('/api/depenses', protect, depenseRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/service-contracts', serviceContractRoutes);
app.use('/api/tenant-access', tenantAccessRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

/** Appels DB après le lookup d'auth de `protect`. */
const routeCalls = () => (pool.query as jest.Mock).mock.calls.slice(1);

const get = (url: string, role = 'gestionnaire') =>
    request(app).get(url).set('Authorization', `Bearer ${authToken(role)}`);

beforeEach(() => {
    jest.clearAllMocks();
    mockValidOwnerIds = [1];
});

describe('GET /api/depenses', () => {
    it('gestionnaire multi-propriétaires → filtre e.owner_id = ANY([1, 2])', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/depenses');

        expect(res.status).toBe(200);
        const [sql, params] = routeCalls()[0];
        expect(sql).toContain('e.owner_id = ANY($1::int[])');
        expect(params).toEqual([[1, 2]]);
    });

    it('admin → aucune clause owner_id', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/depenses', 'admin');

        expect(res.status).toBe(200);
        const [sql, params] = routeCalls()[0];
        expect(sql).not.toContain('owner_id = ANY');
        expect(params).toEqual([]);
    });

    it('gestionnaire sans lien → filtre sur [] (liste vide)', async () => {
        mockValidOwnerIds = [];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/depenses');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        const [sql, params] = routeCalls()[0];
        expect(sql).toContain('e.owner_id = ANY($1::int[])');
        expect(params).toEqual([[]]);
    });
});

describe('GET /api/depenses/stats et /history', () => {
    it('stats : les deux agrégats sont filtrés sur validOwnerIds', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ total: 10 }] })
            .mockResolvedValueOnce({ rows: [{ total: 20 }] });

        const res = await get('/api/depenses/stats');

        expect(res.status).toBe(200);
        for (const [sql, params] of routeCalls()) {
            expect(sql).toContain('owner_id = ANY($1::int[])');
            expect(params).toEqual([[1, 2]]);
        }
        expect(routeCalls()).toHaveLength(2);
    });

    it('stats admin → non filtrées', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ total: 0 }] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] });

        await get('/api/depenses/stats', 'admin');

        for (const [sql] of routeCalls()) expect(sql).not.toContain('owner_id = ANY');
    });

    it('history : filtrée sur validOwnerIds', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await get('/api/depenses/history');

        const [sql, params] = routeCalls()[0];
        expect(sql).toContain('owner_id = ANY($1::int[])');
        expect(params).toEqual([[1]]);
    });
});

describe('GET /api/providers', () => {
    it('gestionnaire multi-propriétaires + filtres → clause owner et numérotation LIMIT/OFFSET cohérente', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/providers?specialty=plomberie&status=active');

        expect(res.status).toBe(200);
        const [countSql, countParams] = routeCalls()[0];
        expect(countSql).toContain('specialty = $1');
        expect(countSql).toContain('status = $2');
        expect(countSql).toContain('owner_id = ANY($3::int[])');
        expect(countParams).toEqual(['plomberie', 'active', [1, 2]]);
        const [dataSql, dataParams] = routeCalls()[1];
        expect(dataSql).toContain('owner_id = ANY($3::int[])');
        expect(dataSql).toContain('LIMIT $4 OFFSET $5');
        expect(dataParams.slice(0, 3)).toEqual(['plomberie', 'active', [1, 2]]);
        expect(dataParams).toHaveLength(5);
    });

    it('admin → non filtré', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await get('/api/providers', 'admin');

        const [countSql, countParams] = routeCalls()[0];
        expect(countSql).not.toContain('owner_id = ANY');
        expect(countParams).toEqual([]);
        expect(routeCalls()[1][0]).toContain('LIMIT $1 OFFSET $2');
    });

    it('gestionnaire sans lien → filtre sur []', async () => {
        mockValidOwnerIds = [];
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await get('/api/providers');

        expect(routeCalls()[0][1]).toEqual([[]]);
    });
});

describe('GET /api/service-contracts', () => {
    it('gestionnaire multi-propriétaires → filtre sc.owner_id', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/service-contracts');

        expect(res.status).toBe(200);
        const [sql, params] = routeCalls()[0];
        expect(sql).toContain('sc.owner_id = ANY($1::int[])');
        expect(params).toEqual([[1, 2]]);
    });

    it('admin → non filtré', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await get('/api/service-contracts', 'admin');

        const [sql, params] = routeCalls()[0];
        expect(sql).not.toContain('owner_id = ANY');
        expect(params).toEqual([]);
    });

    it('gestionnaire sans lien → filtre sur []', async () => {
        mockValidOwnerIds = [];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await get('/api/service-contracts');

        expect(routeCalls()[0][1]).toEqual([[]]);
    });
});

describe('GET /api/tenant-access/:tenantId', () => {
    it('locataire hors périmètre → 404, tenant_access jamais lu', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/tenant-access/7');

        expect(res.status).toBe(404);
        const [sql, params] = routeCalls()[0];
        expect(sql).toContain('FROM tenants WHERE id = $1');
        expect(sql).toContain('owner_id = ANY($2::int[])');
        expect(params).toEqual([7, [1, 2]]);
        expect(routeCalls()).toHaveLength(1);
    });

    it('gestionnaire sans lien → 404 (filtre sur [])', async () => {
        mockValidOwnerIds = [];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await get('/api/tenant-access/7');

        expect(res.status).toBe(404);
        expect(routeCalls()[0][1]).toEqual([7, []]);
    });

    it('locataire dans le périmètre → configuration renvoyée', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: 7 }] })
            .mockResolvedValueOnce({ rows: [{ tenant_id: 7, is_active: true }] });

        const res = await get('/api/tenant-access/7');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ tenant_id: 7, is_active: true });
    });

    it('admin → pas de vérif propriétaire, lecture directe', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ tenant_id: 7, is_active: false }] });

        const res = await get('/api/tenant-access/7', 'admin');

        expect(res.status).toBe(200);
        expect(routeCalls()).toHaveLength(1);
        expect(routeCalls()[0][0]).toContain('FROM tenant_access');
    });
});
