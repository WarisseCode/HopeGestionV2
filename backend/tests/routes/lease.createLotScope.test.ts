/**
 * Tests — POST /api/locations : vérification d'appartenance du lot (lot_id).
 *
 * Avant ce correctif, rien ne vérifiait que `lot_id` appartient à un propriétaire
 * géré par l'appelant : le contrôle d'occupation servait d'oracle sur un lot tiers,
 * puis l'INSERT INTO leases et l'UPDATE lots s'exécutaient sur ce lot. Le correctif
 * reprend le pattern de edlRoutes.ts (POST /) : lot → immeuble.owner_id, 404 si lot
 * introuvable, 403 si owner_id hors validOwnerIds (contourné pour admin), et ce
 * AVANT le contrôle d'occupation.
 *
 * DB mockée : on vérifie la séquence de requêtes construites et les statuts.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/notificationService', () => ({
    NotificationService: { send: jest.fn() },
}));

jest.mock('../../utils/cache', () => ({
    cache: { invalidatePrefix: jest.fn(), get: jest.fn(), set: jest.fn() },
}));

let mockValidOwnerIds: number[] = [1];
let mockResolvedOwnerId: number | null = 1;
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default;
            req.resolvedOwnerId = mockResolvedOwnerId;
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
import leaseRoutes from '../../routes/leaseRoutes';

const app = express();
app.use(express.json());
app.use('/api/locations', protect, leaseRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const body = {
    tenant_id: 5,
    lot_id: 77,
    date_debut: '2026-01-01',
    type_contrat: 'location',
    loyer_mensuel: 100000,
};

const sqlCalls = () => (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));

/** Enchaîne les réponses mockées d'une création réussie, après la vérif du lot. */
const mockSuccessfulCreate = () => {
    (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })                    // BEGIN (création transactionnelle, F5)
        .mockResolvedValueOnce({ rows: [{ id: 77 }] })          // verrou du lot (FOR UPDATE)
        .mockResolvedValueOnce({ rows: [] })                    // contrôle d'occupation
        .mockResolvedValueOnce({ rows: [{ id: 9, lot_id: 77 }] }) // INSERT leases
        .mockResolvedValueOnce({ rows: [] })                    // UPDATE reference_bail
        .mockResolvedValueOnce({ rows: [] })                    // UPDATE lots
        .mockResolvedValueOnce({ rows: [] });                   // COMMIT
};

describe('POST /api/locations — appartenance du lot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidOwnerIds = [1];
    });

    it('gestionnaire sans lien avec le propriétaire du lot → 403, ni contrôle d\'occupation, ni INSERT, ni UPDATE lots', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 2 }] });

        const res = await request(app)
            .post('/api/locations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send(body);

        expect(res.status).toBe(403);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).toContain('FROM lots l JOIN buildings b');
        expect(params).toEqual([77]);
        expect(pool.query).toHaveBeenCalledTimes(2);
        const calls = sqlCalls();
        expect(calls.some((s) => s.includes('FROM leases WHERE lot_id'))).toBe(false);
        expect(calls.some((s) => s.includes('INSERT INTO leases'))).toBe(false);
        expect(calls.some((s) => s.includes('UPDATE lots'))).toBe(false);
        expect(calls).not.toContain('BEGIN'); // refus avant toute transaction
    });

    it('lot inexistant → 404, aucun INSERT', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/locations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send(body);

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(sqlCalls().some((s) => s.includes('INSERT INTO leases'))).toBe(false);
        expect(sqlCalls()).not.toContain('BEGIN');
    });

    it('gestionnaire lié (multi-propriétaires) → vérif du lot puis création inchangée (201)', async () => {
        mockValidOwnerIds = [1, 2];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 2 }] });
        mockSuccessfulCreate();

        const res = await request(app)
            .post('/api/locations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send(body);

        expect(res.status).toBe(201);
        const calls = sqlCalls();
        const lotIdx = calls.findIndex((s) => s.includes('FROM lots l JOIN buildings b'));
        const occIdx = calls.findIndex((s) => s.includes('FROM leases WHERE lot_id'));
        expect(lotIdx).toBeGreaterThan(0);
        expect(occIdx).toBeGreaterThan(lotIdx);
        expect(calls.some((s) => s.includes('INSERT INTO leases'))).toBe(true);
        expect(calls.some((s) => s.includes('UPDATE lots'))).toBe(true);
    });

    it('admin → lot d\'un propriétaire non lié accepté (contournement admin inchangé)', async () => {
        mockValidOwnerIds = [];
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 99 }] });
        mockSuccessfulCreate();

        const res = await request(app)
            .post('/api/locations')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send(body);

        expect(res.status).toBe(201);
        expect(sqlCalls().some((s) => s.includes('INSERT INTO leases'))).toBe(true);
    });
});

/**
 * Création en une seule transaction (audit F5) : bail, référence, statut du lot et
 * échéancier sont validés ensemble (COMMIT) ou annulés ensemble (ROLLBACK).
 * Base simulée par contenu SQL (et non par ordre) pour décrire chaque scénario.
 */
describe('POST /api/locations — création transactionnelle', () => {
    type Opts = { occupied?: boolean; failOn?: string; lotOwner?: number };
    const routeDb = (opts: Opts = {}) => {
        (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
            if (opts.failOn && sql.includes(opts.failOn)) throw new Error('panne simulée');
            if (sql.includes('SELECT email')) return { rows: [{ email: 'test@test.com' }] };
            if (sql.includes('FROM lots l JOIN buildings b')) return { rows: [{ owner_id: opts.lotOwner ?? 1 }] };
            if (sql.includes('FROM leases WHERE lot_id')) return { rows: opts.occupied ? [{ id: 3 }] : [] };
            if (sql.includes('INSERT INTO leases')) return { rows: [{ id: 9, lot_id: 77 }] };
            return { rows: [] };
        });
    };
    const post = (extra: Record<string, unknown> = {}) =>
        request(app).post('/api/locations').set('Authorization', `Bearer ${authToken()}`).send({ ...body, ...extra });

    beforeEach(() => {
        jest.clearAllMocks();
        (pool.query as jest.Mock).mockReset();
        mockValidOwnerIds = [1];
        mockResolvedOwnerId = 1;
    });

    it('succès : BEGIN, verrou du lot avant le contrôle d’occupation, puis COMMIT en dernier', async () => {
        routeDb();
        const res = await post({ type_paiement: 'echelonne', duree_contrat: 3 });

        expect(res.status).toBe(201);
        const calls = sqlCalls();
        const begin = calls.indexOf('BEGIN');
        const lock = calls.findIndex((s) => s.includes('FOR UPDATE'));
        const occ = calls.findIndex((s) => s.includes('FROM leases WHERE lot_id'));
        const sched = calls.findIndex((s) => s.includes('INSERT INTO payment_schedules'));
        expect(begin).toBeGreaterThan(-1);
        expect(lock).toBeGreaterThan(begin);
        expect(occ).toBeGreaterThan(lock);
        expect(sched).toBeGreaterThan(occ);
        expect(calls[calls.length - 1]).toBe('COMMIT');
        expect(calls).not.toContain('ROLLBACK');
    });

    it('échec de l’échéancier : ROLLBACK (bail, référence et lot annulés), aucun COMMIT, 500', async () => {
        routeDb({ failOn: 'INSERT INTO payment_schedules' });
        const res = await post({ type_paiement: 'echelonne', duree_contrat: 3 });

        expect(res.status).toBe(500);
        const calls = sqlCalls();
        expect(calls).toContain('ROLLBACK');
        expect(calls).not.toContain('COMMIT');
        expect(calls.findIndex((s) => s.includes('INSERT INTO leases'))).toBeLessThan(calls.indexOf('ROLLBACK'));
    });

    it('échec de la mise à jour du lot : ROLLBACK, aucun COMMIT', async () => {
        routeDb({ failOn: 'UPDATE lots' });
        const res = await post();

        expect(res.status).toBe(500);
        expect(sqlCalls()).toContain('ROLLBACK');
        expect(sqlCalls()).not.toContain('COMMIT');
    });

    it('lot déjà occupé : 400, ROLLBACK (verrou libéré), aucun INSERT', async () => {
        routeDb({ occupied: true });
        const res = await post();

        expect(res.status).toBe(400);
        const calls = sqlCalls();
        expect(calls).toContain('ROLLBACK');
        expect(calls).not.toContain('COMMIT');
        expect(calls.some((s) => s.includes('INSERT INTO leases'))).toBe(false);
    });

    it('propriétaire choisi (resolvedOwnerId) : utilisé pour le bail, comportement inchangé', async () => {
        routeDb({ lotOwner: 1 });
        await post();
        const insert = (pool.query as jest.Mock).mock.calls.find(([s]) => String(s).includes('INSERT INTO leases'));
        expect(insert[1][2]).toBe(1);
    });

    it('échéance au-delà de la capacité de l’échéancier : 400 clair, avant toute écriture', async () => {
        routeDb();
        const res = await post({ loyer_mensuel: 20_000_000_000, type_paiement: 'echelonne', duree_contrat: 3 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Montant d'échéance trop élevé/);
        const calls = sqlCalls();
        expect(calls).not.toContain('BEGIN');
        expect(calls.some((s) => s.includes('INSERT INTO leases'))).toBe(false);
    });

    it('même loyer en paiement classique (sans échéancier) : accepté comme avant', async () => {
        routeDb();
        const res = await post({ loyer_mensuel: 20_000_000_000 });

        expect(res.status).toBe(201);
        expect(sqlCalls().some((s) => s.includes('INSERT INTO payment_schedules'))).toBe(false);
    });

    it('aucun propriétaire choisi (multi-propriétaires) : le bail prend le propriétaire du lot, pas NULL', async () => {
        mockValidOwnerIds = [1, 2];
        mockResolvedOwnerId = null;
        routeDb({ lotOwner: 2 });
        const res = await post();

        expect(res.status).toBe(201);
        const insert = (pool.query as jest.Mock).mock.calls.find(([s]) => String(s).includes('INSERT INTO leases'));
        expect(insert[1][2]).toBe(2);
    });
});
