/**
 * Tests — Correctif de sécurité C5 (audit initial) sur reservationRoutes.ts
 * (GET /, POST /:id/validate, POST /:id/transform).
 *
 * `leases` n'a pas de politique RLS versionnée : ces routes listaient/modifiaient
 * des réservations sans filtre propriétaire. Le correctif ajoute
 * `owner_id = ANY(validOwnerIds)` (scopeByOwner, même pattern que leaseRoutes.ts),
 * contourné pour le rôle admin. DB mockée : on vérifie la requête construite
 * (SQL + params) et le 404 quand le filtre exclut la ligne.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
            req.resolvedOwnerId = 1;
            req.validOwnerIds   = mockValidOwnerIds;
            next();
        },
    };
});

import pool from '../../db/database';
import reservationRoutes from '../../routes/reservationRoutes';

// ── App de test (même montage que index.ts : protect est appliqué dans le router) ──

const app = express();
app.use(express.json());
app.use('/api/reservations', reservationRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

/** `protect` fait toujours un premier SELECT email avant que la route ne s'exécute. */
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const q = () => pool.query as jest.Mock;

describe('GET /api/reservations — filtre owner_id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    it('gestionnaire multi-propriétaires : la requête inclut l.owner_id = ANY([1, 2])', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [{ id: 7 }] });

        const res = await request(app).get('/api/reservations').set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 7 }]);
        const [sql, params] = q().mock.calls[1];
        expect(sql).toContain("l.type_contrat = 'reservation' AND l.owner_id = ANY($1::int[])");
        expect(params).toEqual([[1, 2]]);
    });

    it('admin : aucun filtre owner_id', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/reservations').set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        const [sql, params] = q().mock.calls[1];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual([]);
    });
});

describe('POST /api/reservations/:id/validate — filtre owner_id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    it('gestionnaire multi-propriétaires : UPDATE filtré par owner_id = ANY($3)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({ rowCount: 1, rows: [{ lot_id: null }] });

        const res = await request(app)
            .post('/api/reservations/42/validate')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ statut: 'refuse' });

        expect(res.status).toBe(200);
        const [sql, params] = q().mock.calls[1];
        expect(sql).toContain('UPDATE leases');
        expect(sql).toContain('owner_id = ANY($3::int[])');
        expect(params).toEqual(['refuse', '42', [1, 2]]);
    });

    it('admin : UPDATE sans filtre owner_id', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rowCount: 1, rows: [{ lot_id: null }] });

        const res = await request(app)
            .post('/api/reservations/42/validate')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send({ statut: 'refuse' });

        expect(res.status).toBe(200);
        const [sql, params] = q().mock.calls[1];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual(['refuse', '42']);
    });

    it('réservation hors périmètre : 404, aucune mise à jour du lot', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .post('/api/reservations/999/validate')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ statut: 'actif' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Réservation non trouvée ou accès refusé');
        expect(q()).toHaveBeenCalledTimes(2);
    });
});

describe('POST /api/reservations/:id/transform — filtre owner_id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockValidOwnerIds = [1]; });

    it('gestionnaire multi-propriétaires : SELECT initial filtré par l.owner_id = ANY($2)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        q().mockResolvedValueOnce({});            // BEGIN
        q().mockResolvedValueOnce({ rows: [] });  // SELECT réservation
        q().mockResolvedValueOnce({});            // ROLLBACK

        const res = await request(app)
            .post('/api/reservations/42/transform')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(404);
        expect(q().mock.calls[1][0]).toBe('BEGIN');
        const [sql, params] = q().mock.calls[2];
        expect(sql).toContain('l.owner_id = ANY($2::int[])');
        expect(params).toEqual(['42', [1, 2]]);
    });

    it('admin : SELECT initial sans filtre owner_id', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({});
        q().mockResolvedValueOnce({ rows: [] });
        q().mockResolvedValueOnce({});

        const res = await request(app)
            .post('/api/reservations/42/transform')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send({});

        expect(res.status).toBe(404);
        const [sql, params] = q().mock.calls[2];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual(['42']);
    });

    it('réservation hors périmètre : 404 + ROLLBACK, aucune écriture', async () => {
        mockAuthLookup();
        q().mockResolvedValueOnce({});
        q().mockResolvedValueOnce({ rows: [] });
        q().mockResolvedValueOnce({});

        const res = await request(app)
            .post('/api/reservations/999/transform')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Réservation non trouvée, non validée ou accès refusé');
        expect(q().mock.calls[3][0]).toBe('ROLLBACK');
        expect(q()).toHaveBeenCalledTimes(4);
    });
});
