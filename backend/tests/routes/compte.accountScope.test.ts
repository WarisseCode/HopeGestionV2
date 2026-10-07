/**
 * Tests d'intégration — Correctif de sécurité C3 : gestion des comptes utilisateurs et
 * propriétaires dans /api/compte (distinct de C1 /register et C2 /invite-user).
 *
 * Avant ce correctif :
 *  - POST /utilisateurs acceptait n'importe quel `role` (création ET mise à jour) → un
 *    gestionnaire pouvait créer un admin ou promouvoir un compte existant en admin ;
 *  - suspend / delete / reactivate ne contrôlaient que le rôle de l'appelant, jamais le
 *    compte ciblé (admin inclus, hors portée inclus) ;
 *  - PUT / DELETE /proprietaires/:id ne vérifiaient le lien owner_user que pour le rôle
 *    proprietaire ;
 *  - le login comparait statut === 'suspendu' alors que /suspend écrit 'Suspendu'.
 *
 * DB mockée : on vérifie qu'aucune écriture n'est émise quand la requête est refusée.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../services/EmailService', () => ({
    __esModule: true,
    default: { sendEmail: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('bcrypt', () => ({
    ...jest.requireActual('bcrypt'),
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
}));

import bcrypt from 'bcrypt';
import db from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import compteRouter from '../../routes/compteRoutes';
import authRouter from '../../routes/authRoutes';

// ── Apps de test ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/compte', protect, compteRouter);
app.use('/api/auth', authRouter);

const JWT_SECRET = process.env.JWT_SECRET!;
const tokenFor = (role: string, id = 7) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

const queryMock = () => db.query as jest.Mock;
let mockClient: { query: jest.Mock; release: jest.Mock };

/** Toutes les requêtes d'écriture émises (pool direct + client transactionnel). */
const writeCalls = () => [
    ...queryMock().mock.calls,
    ...(mockClient?.query.mock.calls ?? []),
].filter(([sql]) => /\b(INSERT|UPDATE|DELETE)\b/i.test(sql));

beforeEach(() => {
    jest.clearAllMocks();
    queryMock().mockReset();
    mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    (db.connect as jest.Mock).mockResolvedValue(mockClient);
});

// ── POST /utilisateurs : création ─────────────────────────────────────────────

describe('POST /api/compte/utilisateurs — création (faille C3)', () => {
    const create = (callerRole: string, body: Record<string, unknown>) =>
        request(app)
            .post('/api/compte/utilisateurs')
            .set('Authorization', `Bearer ${tokenFor(callerRole)}`)
            .send({ nom: 'Dupont', email: 'dupont@test.dev', ...body });

    it.each(['gestionnaire', 'proprietaire'])('"%s" qui crée un admin : 403, aucun INSERT', async (caller) => {
        const res = await create(caller, { role: 'admin' });
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
    });

    it.each(['gestionnaire', 'manager'])('gestionnaire qui crée un "%s" : 403', async (target) => {
        const res = await create('gestionnaire', { role: target });
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
    });

    it('gestionnaire sans rôle (ancien défaut user_type=gestionnaire) : 400', async () => {
        const res = await create('gestionnaire', {});
        expect(res.status).toBe(400);
        expect(writeCalls()).toHaveLength(0);
    });

    it.each(['super_admin', 'ADMIN', 'locataire'])('admin avec rôle hors liste blanche "%s" : 400', async (bad) => {
        const res = await create('admin', { role: bad });
        expect(res.status).toBe(400);
        expect(writeCalls()).toHaveLength(0);
    });

    it('rôle sous forme de tableau ["admin"] : refusé, aucun INSERT', async () => {
        const res = await create('gestionnaire', { role: ['admin'] });
        expect([400, 403]).toContain(res.status);
        expect(writeCalls()).toHaveLength(0);
    });

    it('gestionnaire qui crée un comptable : 200, rôle + created_by écrits', async () => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 99, role: 'comptable' }] });
        const res = await create('gestionnaire', { role: 'comptable' });
        expect(res.status).toBe(200);
        const insert = queryMock().mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
        expect(insert![1][3]).toBe('comptable'); // role
        expect(insert![1][7]).toBe('comptable'); // user_type
        expect(insert![1][8]).toBe(7);           // created_by = appelant
    });

    it('admin qui crée un admin : 200', async () => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 100, role: 'admin' }] });
        const res = await create('admin', { role: 'admin' });
        expect(res.status).toBe(200);
    });
});

// ── POST /utilisateurs : mise à jour ──────────────────────────────────────────

describe('POST /api/compte/utilisateurs — mise à jour (faille C3)', () => {
    const update = (callerRole: string, body: Record<string, unknown>) =>
        request(app)
            .post('/api/compte/utilisateurs')
            .set('Authorization', `Bearer ${tokenFor(callerRole)}`)
            .send({ id: 50, nom: 'Dupont', ...body });

    it('gestionnaire qui promeut un compte de sa portée en admin : 403, aucun UPDATE', async () => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 50, role: 'comptable', user_type: 'comptable' }] });
        const res = await update('gestionnaire', { role: 'admin' });
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
        // Le SELECT de portée applique le filtre id/created_by de GET /utilisateurs.
        expect(queryMock().mock.calls[0][0]).toMatch(/created_by = \$2/);
        expect(queryMock().mock.calls[0][1]).toEqual([50, 7]);
    });

    it('gestionnaire qui modifie un compte hors de sa portée : 404, aucun UPDATE', async () => {
        queryMock().mockResolvedValueOnce({ rows: [] }); // created_by différent → hors portée
        const res = await update('gestionnaire', { role: 'comptable' });
        expect(res.status).toBe(404);
        expect(writeCalls()).toHaveLength(0);
    });

    it('gestionnaire qui modifie un compte admin (même dans sa portée) : 403', async () => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 50, role: 'admin', user_type: 'admin' }] });
        const res = await update('gestionnaire', { role: 'admin' });
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
    });

    it('gestionnaire qui modifie son propre compte sans changer de rôle : 200', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 7, role: 'gestionnaire', user_type: 'gestionnaire' }] })
            .mockResolvedValueOnce({ rows: [{ id: 7 }] });
        const res = await update('gestionnaire', { id: 7, role: 'gestionnaire' });
        expect(res.status).toBe(200);
        const upd = queryMock().mock.calls.find(([sql]) => /UPDATE users/i.test(sql));
        expect(upd![1][4]).toBe('gestionnaire');
    });

    it('rôle absent en mise à jour : le rôle actuel est conservé (pas de NULL)', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 50, role: 'comptable', user_type: 'comptable' }] })
            .mockResolvedValueOnce({ rows: [{ id: 50 }] });
        const res = await update('gestionnaire', {});
        expect(res.status).toBe(200);
        const upd = queryMock().mock.calls.find(([sql]) => /UPDATE users/i.test(sql));
        expect(upd![1][4]).toBe('comptable');
        expect(upd![0]).toMatch(/WHERE id = \$8 AND \(id = \$9 OR created_by = \$9\)/);
        expect(upd![1][8]).toBe(7);
    });

    it('UPDATE filtré ne touchant aucune ligne (course) : 404', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 50, role: 'comptable', user_type: 'comptable' }] })
            .mockResolvedValueOnce({ rows: [] });
        const res = await update('gestionnaire', {});
        expect(res.status).toBe(404);
    });

    it('admin qui promeut un compte en admin : 200, pas de filtre de portée', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 50, role: 'comptable', user_type: 'comptable' }] })
            .mockResolvedValueOnce({ rows: [{ id: 50 }] });
        const res = await update('admin', { role: 'admin' });
        expect(res.status).toBe(200);
        expect(queryMock().mock.calls[0][1]).toEqual([50]);
    });
});

// ── suspend / delete / reactivate ─────────────────────────────────────────────

const actions: Array<[string, (callerRole: string, id: number) => request.Test]> = [
    ['suspend', (r, id) => request(app).patch(`/api/compte/utilisateurs/${id}/suspend`).set('Authorization', `Bearer ${tokenFor(r)}`)],
    ['delete', (r, id) => request(app).delete(`/api/compte/utilisateurs/${id}`).set('Authorization', `Bearer ${tokenFor(r)}`)],
    ['reactivate', (r, id) => request(app).patch(`/api/compte/utilisateurs/${id}/reactivate`).set('Authorization', `Bearer ${tokenFor(r)}`)],
];

describe.each(actions)('%s /api/compte/utilisateurs/:id (faille C3)', (_name, call) => {
    it.each(['gestionnaire', 'proprietaire'])('"%s" qui cible un compte admin : 403, aucune écriture', async (caller) => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 1, role: 'admin', user_type: 'admin' }] });
        const res = await call(caller, 1);
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
        expect(db.connect).not.toHaveBeenCalled();
    });

    it('cible admin repérée via user_type (rôle incohérent) : 403', async () => {
        queryMock().mockResolvedValueOnce({ rows: [{ id: 1, role: 'comptable', user_type: 'Admin' }] });
        const res = await call('gestionnaire', 1);
        expect(res.status).toBe(403);
        expect(writeCalls()).toHaveLength(0);
    });

    it('gestionnaire qui cible un compte hors portée (created_by différent) : 404, aucune écriture', async () => {
        queryMock().mockResolvedValueOnce({ rows: [] });
        const res = await call('gestionnaire', 123);
        expect(res.status).toBe(404);
        expect(writeCalls()).toHaveLength(0);
        expect(queryMock().mock.calls[0][0]).toMatch(/id = \$2 OR created_by = \$2/);
        expect(queryMock().mock.calls[0][1]).toEqual(['123', 7]);
    });

    it('gestionnaire qui cible un comptable de sa portée : 200, portée répétée dans l\'écriture', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 123, role: 'comptable', user_type: 'comptable' }] })
            .mockResolvedValue({ rows: [{ id: 123 }] });
        mockClient.query.mockResolvedValue({ rows: [{ id: 123 }] });
        const res = await call('gestionnaire', 123);
        expect(res.status).toBe(200);
        expect(writeCalls().length).toBeGreaterThan(0);
        // UPDATE (suspend/reactivate) ou SELECT ... FOR UPDATE (delete) re-filtrent la portée.
        const guarded = [...queryMock().mock.calls, ...mockClient.query.mock.calls]
            .filter(([sql]) => /(UPDATE users SET statut|FOR UPDATE)/.test(sql));
        expect(guarded).toHaveLength(1);
        expect(guarded[0][0]).toMatch(/created_by = \$\d+\) AND LOWER\(TRIM\(COALESCE\(role/);
        expect(guarded[0][1]).toContain(7);
    });

    it('compte devenu hors portée entre le contrôle et l\'écriture : 404', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 123, role: 'comptable', user_type: 'comptable' }] })
            .mockResolvedValue({ rows: [] }); // écriture filtrée : 0 ligne
        mockClient.query.mockResolvedValue({ rows: [] });
        const res = await call('gestionnaire', 123);
        expect(res.status).toBe(404);
        expect(mockClient.query.mock.calls.some(([sql]) => /DELETE FROM users/.test(sql))).toBe(false);
    });

    it('admin qui cible un compte admin : 200 (aucune restriction)', async () => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ id: 1, role: 'admin', user_type: 'admin' }] })
            .mockResolvedValue({ rows: [{ id: 1 }] });
        mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });
        const res = await call('admin', 1);
        expect(res.status).toBe(200);
        expect(queryMock().mock.calls[0][1]).toEqual(['1']);
    });
});

// ── PUT / DELETE /proprietaires/:id ───────────────────────────────────────────

describe('PUT & DELETE /api/compte/proprietaires/:id — lien owner_user (faille C3)', () => {
    const put = (r: string) => request(app).put('/api/compte/proprietaires/5')
        .set('Authorization', `Bearer ${tokenFor(r)}`).send({ name: 'X' });
    const del = (r: string) => request(app).delete('/api/compte/proprietaires/5')
        .set('Authorization', `Bearer ${tokenFor(r)}`);

    it.each([
        ['PUT', 'gestionnaire', put], ['PUT', 'manager', put], ['PUT', 'proprietaire', put],
        ['DELETE', 'gestionnaire', del], ['DELETE', 'manager', del],
    ])('%s par "%s" sans lien owner_user actif : 404, aucune écriture', async (_m, caller, call) => {
        queryMock().mockResolvedValueOnce({ rows: [] });
        const res = await (call as typeof put)(caller as string);
        expect(res.status).toBe(404);
        expect(writeCalls()).toHaveLength(0);
        expect(queryMock().mock.calls[0][0]).toMatch(/FROM owner_user WHERE owner_id = \$1 AND user_id = \$2 AND is_active = TRUE/);
        expect(queryMock().mock.calls[0][1]).toEqual(['5', 7]);
    });

    it.each([['PUT', put], ['DELETE', del]])('%s par un gestionnaire lié : 200', async (_m, call) => {
        queryMock()
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [{ id: 5 }] });
        const res = await (call as typeof put)('gestionnaire');
        expect(res.status).toBe(200);
    });

    it.each([['PUT', put], ['DELETE', del]])('%s par un admin : pas de contrôle owner_user', async (_m, call) => {
        queryMock().mockResolvedValue({ rows: [{ id: 5 }] });
        const res = await (call as typeof put)('admin');
        expect(res.status).toBe(200);
        expect(queryMock().mock.calls.some(([sql]) => /owner_user/.test(sql))).toBe(false);
    });
});

// ── Login d'un compte suspendu ────────────────────────────────────────────────

describe('POST /api/auth/login — compte suspendu (bug de casse lié à C3)', () => {
    const userRow = (statut: string) => ({
        id: 42, password_hash: '$2b$10$hashed', role: 'comptable', user_type: 'comptable',
        statut, is_verified: true,
    });

    it.each(['Suspendu', 'suspendu', 'SUSPENDU', 'Inactif', ' suspendu '])(
        'statut "%s" : login refusé (401), aucun token émis',
        async (statut) => {
            queryMock().mockResolvedValueOnce({ rows: [userRow(statut)] });
            const res = await request(app).post('/api/auth/login')
                .send({ email: 'user@test.dev', password: 'secret' });
            expect(res.status).toBe(401);
            expect(res.body.token).toBeUndefined();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        }
    );

    it('statut "Actif" (écrit par /reactivate) : login non bloqué par le statut', async () => {
        queryMock().mockResolvedValueOnce({ rows: [userRow('Actif')] }).mockResolvedValue({ rows: [] });
        await request(app).post('/api/auth/login').send({ email: 'user@test.dev', password: 'secret' });
        expect(bcrypt.compare).toHaveBeenCalled();
    });
});
