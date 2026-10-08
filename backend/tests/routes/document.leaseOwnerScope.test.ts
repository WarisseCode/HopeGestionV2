/**
 * Tests — Correctif de sécurité C5 (audit initial) sur documentRoutes.ts
 * (POST /generate pour type 'lease', POST /generate/lease/:id).
 *
 * `leases` n'a pas de politique RLS versionnée : ces routes chargeaient un bail
 * par son seul id. Le correctif ajoute `l.owner_id = ANY(validOwnerIds)`
 * (scopeByOwner, même pattern que leaseRoutes.ts), contourné pour l'admin, y
 * compris sur le contrôle de doublon de /generate/lease/:id (sinon le message
 * « existe déjà » confirmerait l'existence d'un bail tiers). DB mockée : on
 * vérifie la requête construite et le 404 ; la génération PDF n'est jamais atteinte.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/spacesUploadService', () => ({
    uploadToSpaces: jest.fn(),
}));

let mockValidOwnerIds: number[] = [1];
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default;
            req.resolvedOwnerId = 1;
            req.validOwnerIds   = mockValidOwnerIds;
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
}));

import pool from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import documentRoutes from '../../routes/documentRoutes';

// ── App de test (même montage que index.ts) ───────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/documents', protect, documentRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const q = () => pool.query as jest.Mock;

describe("POST /api/documents/generate (type 'lease') — filtre owner_id", () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    const send = (role?: string) => request(app)
        .post('/api/documents/generate')
        .set('Authorization', `Bearer ${authToken(role)}`)
        .send({ templateId: 3, entityId: 42, type: 'lease' });

    it('gestionnaire multi-propriétaires : la requête bail inclut l.owner_id = ANY($2)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 3, name: 'Modele', content: 'x' }] }); // template
        q().mockResolvedValueOnce({ rows: [] });                                         // bail

        const res = await send();

        expect(res.status).toBe(404);
        const [sql, params] = q().mock.calls[2];
        expect(sql).toContain('FROM leases l');
        expect(sql).toContain('l.owner_id = ANY($2::int[])');
        expect(params).toEqual([42, [1, 2]]);
    });

    it('admin : requête bail sans filtre owner_id', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 3, name: 'Modele', content: 'x' }] });
        q().mockResolvedValueOnce({ rows: [] });

        await send('admin');

        const [sql, params] = q().mock.calls[2];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual([42]);
    });

    it('bail hors périmètre : 404, aucun document inséré', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 3, name: 'Modele', content: 'x' }] });
        q().mockResolvedValueOnce({ rows: [] });

        const res = await send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Bail introuvable ou accès refusé');
        expect(q()).toHaveBeenCalledTimes(3);
    });
});

describe('POST /api/documents/generate/lease/:id — filtre owner_id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    const send = (id = 42, role?: string) => request(app)
        .post(`/api/documents/generate/lease/${id}`)
        .set('Authorization', `Bearer ${authToken(role)}`)
        .send({});

    it('gestionnaire multi-propriétaires : contrôle de doublon restreint aux baux du périmètre', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 9 }] }); // doublon trouvé (bail du périmètre)

        const res = await send();

        expect(res.status).toBe(400);
        const [sql, params] = q().mock.calls[1];
        expect(sql).toContain('FROM documents');
        expect(sql).toContain('EXISTS (SELECT 1 FROM leases l WHERE l.id = documents.entity_id AND l.owner_id = ANY($2::int[]))');
        expect(params).toEqual(['42', [1, 2]]);
    });

    it('gestionnaire multi-propriétaires : requête bail filtrée par l.owner_id = ANY($2)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [] }); // pas de doublon
        q().mockResolvedValueOnce({ rows: [] }); // bail

        const res = await send();

        expect(res.status).toBe(404);
        const [sql, params] = q().mock.calls[2];
        expect(sql).toContain('FROM leases l');
        expect(sql).toContain('l.owner_id = ANY($2::int[])');
        expect(params).toEqual(['42', [1, 2]]);
    });

    it('admin : aucune des deux requêtes n\'est filtrée', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [] });
        q().mockResolvedValueOnce({ rows: [] });

        await send(42, 'admin');

        const [dupSql, dupParams] = q().mock.calls[1];
        expect(dupSql).not.toContain('EXISTS');
        expect(dupSql).not.toContain('owner_id = ANY(');
        expect(dupParams).toEqual(['42']);
        const [sql, params] = q().mock.calls[2];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual(['42']);
    });

    it('bail hors périmètre : 404 (pas le 400 « existe déjà »)', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [] }); // doublon masqué par le filtre
        q().mockResolvedValueOnce({ rows: [] }); // bail exclu par le filtre

        const res = await send(999);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Bail non trouvé ou accès refusé');
        expect(q()).toHaveBeenCalledTimes(3);
    });
});
