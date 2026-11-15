/**
 * Tests — modèles de documents par agence (audit 2026-11-14, constat S3).
 *
 * Avant : document_templates commun à toutes les agences, lecture ET écriture.
 * Après :
 *  - modèles Hope (agency_user_id NULL) visibles par tous, modifiables par l'admin ;
 *  - modèles d'agence visibles/modifiables par leur agence seulement ;
 *  - agence = compte lui-même, ou son créateur (collaborateur), ou l'émetteur (invité).
 *
 * DB mockée : on vérifie le SQL construit, les paramètres et les statuts.
 */

import request from 'supertest';
import express from 'express';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));
// templateRoutes importe `pool` depuis index : on le redirige vers le même mock
jest.mock('../../index', () => ({ pool: require('../../db/database').default }));

jest.mock('../../middleware/permissionMiddleware', () => {
    const pass = (_m: string) => (_req: any, _res: any, next: any) => next();
    const perms = { canRead: pass, canWrite: pass, canDelete: pass, canValidate: pass };
    return { __esModule: true, default: perms, permissions: perms };
});

import pool from '../../db/database';
import templateRoutes from '../../routes/templateRoutes';

// Faux `protect` : identité injectée par en-têtes de test
let mockUser: { id: number; role: string; isGuest?: boolean; issuerId?: number } = { id: 10, role: 'gestionnaire' };
const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
    req.userId = mockUser.id;
    req.userRole = mockUser.role;
    req.user = { id: mockUser.id, role: mockUser.role, isGuest: !!mockUser.isGuest, issuerId: mockUser.issuerId ?? null };
    next();
});
app.use('/api/templates', templateRoutes);

const q = pool.query as jest.Mock;
/** Réponse de resolveAgencyUserId (lecture du créateur du compte). */
const mockAgencyLookup = (created_by: number | null = null, creator_role: string | null = null) =>
    q.mockResolvedValueOnce({ rows: [{ created_by, creator_role, creator_super: false }] });

beforeEach(() => {
    q.mockReset();
    mockUser = { id: 10, role: 'gestionnaire' };
});

describe('GET /api/templates', () => {
    it('gestionnaire : modèles Hope + modèles de son agence, avec le drapeau editable', async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [
            { id: 1, name: 'Contrat Hope', agency_user_id: null },
            { id: 2, name: 'Mon contrat', agency_user_id: 10 },
        ] });

        const res = await request(app).get('/api/templates');

        expect(res.status).toBe(200);
        const [sql, params] = q.mock.calls[1];
        expect(sql).toContain('agency_user_id IS NULL OR document_templates.agency_user_id = $1');
        expect(params).toEqual([10]);
        expect(res.body.map((t: any) => t.editable)).toEqual([false, true]);
    });

    it('collaborateur créé par un gestionnaire : voit les modèles de cette agence', async () => {
        mockUser = { id: 20, role: 'comptable' };
        mockAgencyLookup(10, 'gestionnaire');
        q.mockResolvedValueOnce({ rows: [] });

        await request(app).get('/api/templates');

        expect(q.mock.calls[1][1]).toEqual([10]);
    });

    it('compte créé par l\'admin Hope : agence à part entière (pas celle de l\'admin)', async () => {
        mockUser = { id: 30, role: 'gestionnaire' };
        mockAgencyLookup(1, 'admin');
        q.mockResolvedValueOnce({ rows: [] });

        await request(app).get('/api/templates');

        expect(q.mock.calls[1][1]).toEqual([30]);
    });

    it('accès invité : rattaché au compte émetteur', async () => {
        mockUser = { id: 40, role: 'guest', isGuest: true, issuerId: 10 };
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [] });

        await request(app).get('/api/templates');

        expect(q.mock.calls[0][1]).toEqual([10]); // lookup fait sur l'émetteur
        expect(q.mock.calls[1][1]).toEqual([10]);
    });

    it('admin : tout, sans filtre, tout modifiable', async () => {
        mockUser = { id: 1, role: 'admin' };
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [{ id: 2, agency_user_id: 10 }] });

        const res = await request(app).get('/api/templates');

        const [sql, params] = q.mock.calls[1];
        expect(sql).not.toContain('agency_user_id');
        expect(params).toEqual([]);
        expect(res.body[0].editable).toBe(true);
    });
});

describe('GET /api/templates/:id', () => {
    it("modèle d'une autre agence → 404", async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/templates/99');

        expect(res.status).toBe(404);
        expect(q.mock.calls[1][0]).toContain('WHERE id = $1 AND (document_templates.agency_user_id IS NULL');
    });
});

describe('POST /api/templates', () => {
    it('gestionnaire : le modèle est rattaché à son agence', async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [{ id: 5, agency_user_id: 10 }] });

        const res = await request(app).post('/api/templates').send({ name: 'Mon bail', type: 'lease', content: 'X' });

        expect(res.status).toBe(201);
        const [sql, params] = q.mock.calls[1];
        expect(sql).toContain('agency_user_id');
        expect(params).toEqual(['Mon bail', 'lease', 'X', 10]);
    });

    it('admin : modèle Hope (agency_user_id NULL)', async () => {
        mockUser = { id: 1, role: 'admin' };
        q.mockResolvedValueOnce({ rows: [{ id: 6, agency_user_id: null }] });

        const res = await request(app).post('/api/templates').send({ name: 'Bail Hope', type: 'lease', content: 'X' });

        expect(res.status).toBe(201);
        expect(q.mock.calls[0][1]).toEqual(['Bail Hope', 'lease', 'X', null]);
    });
});

describe.each([
    ['put', { name: 'Nouveau nom' }],
    ['delete', {}],
] as const)('%s /api/templates/:id', (method, body) => {
    it('gestionnaire : écriture limitée aux modèles de son agence', async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [{ id: 2, agency_user_id: 10 }] });

        const res = await (request(app) as any)[method]('/api/templates/2').send(body);

        expect(res.status).toBe(200);
        const [sql, params] = q.mock.calls[1];
        expect(sql).toMatch(/AND document_templates\.agency_user_id = \$\d+/);
        expect(sql).not.toContain('IS NULL');
        expect(params[params.length - 1]).toBe(10);
    });

    it('modèle Hope → 403 (lecture seule, à personnaliser)', async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [] });          // écriture refusée (0 ligne)
        q.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // mais visible

        const res = await (request(app) as any)[method]('/api/templates/1').send(body);

        expect(res.status).toBe(403);
    });

    it("modèle d'une autre agence → 404", async () => {
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [] });
        q.mockResolvedValueOnce({ rows: [] });

        const res = await (request(app) as any)[method]('/api/templates/99').send(body);

        expect(res.status).toBe(404);
    });

    it('admin : aucune restriction', async () => {
        mockUser = { id: 1, role: 'admin' };
        mockAgencyLookup();
        q.mockResolvedValueOnce({ rows: [{ id: 1, agency_user_id: null }] });

        const res = await (request(app) as any)[method]('/api/templates/1').send(body);

        expect(res.status).toBe(200);
        expect(q.mock.calls[1][0]).not.toContain('agency_user_id =');
    });
});
