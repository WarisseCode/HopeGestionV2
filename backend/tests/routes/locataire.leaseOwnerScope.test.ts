/**
 * Tests — Correctif de sécurité C5 (audit initial) sur locataireRoutes.ts
 * (GET /:id, sections baux et paiements).
 *
 * `leases` n'a pas de politique RLS versionnée : la fiche locataire renvoyait
 * tous les baux/paiements du locataire, y compris ceux d'autres propriétaires.
 * Le correctif ajoute `l.owner_id = ANY(validOwnerIds)` (scopeByOwner, même
 * pattern que leaseRoutes.ts) sur ces deux requêtes, contourné pour l'admin.
 * DB mockée : on vérifie la requête construite (SQL + params).
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// AuditService importe `pool` depuis index.ts (démarrerait toute l'app) : mocké.
jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn() },
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
import locataireRoutes from '../../routes/locataireRoutes';

// ── App de test (protect est appliqué route par route dans le router) ─────────

const app = express();
app.use(express.json());
app.use('/api/locataires', locataireRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const q = () => pool.query as jest.Mock;

describe('GET /api/locataires/:id — baux et paiements filtrés par owner_id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    it('gestionnaire multi-propriétaires : baux et paiements filtrés par l.owner_id = ANY($2)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 5 }] });              // locataire
        q().mockResolvedValueOnce({ rows: [{ id: 42, owner_id: 2 }] }); // baux
        q().mockResolvedValueOnce({ rows: [] });                       // paiements

        const res = await request(app).get('/api/locataires/5').set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.baux).toEqual([{ id: 42, owner_id: 2 }]);

        const [leasesSql, leasesParams] = q().mock.calls[2];
        expect(leasesSql).toContain('l.tenant_id = $1 AND l.owner_id = ANY($2::int[])');
        expect(leasesParams).toEqual([5, [1, 2]]);

        const [paySql, payParams] = q().mock.calls[3];
        expect(paySql).toContain('FROM payments p');
        expect(paySql).toContain('l.tenant_id = $1 AND l.owner_id = ANY($2::int[])');
        expect(payParams).toEqual([5, [1, 2]]);
    });

    it('admin : aucune des deux requêtes n\'est filtrée', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 5 }] });
        q().mockResolvedValueOnce({ rows: [] });
        q().mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/locataires/5').set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        for (const i of [2, 3]) {
            const [sql, params] = q().mock.calls[i];
            expect(sql).not.toContain('owner_id = ANY(');
            expect(params).toEqual([5]);
        }
    });

    // Pas de 404 ici : la route vise un locataire (table tenants), pas un bail.
    // Les baux/paiements ne sont qu'une section de la réponse ; un bail hors
    // périmètre en est simplement retiré, sans confirmer son existence.
    it('baux d\'un autre propriétaire exclus : listes vides renvoyées', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 5 }] });
        q().mockResolvedValueOnce({ rows: [] }); // bail tiers exclu par le filtre
        q().mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/locataires/5').set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.baux).toEqual([]);
        expect(res.body.paiements).toEqual([]);
    });
});
