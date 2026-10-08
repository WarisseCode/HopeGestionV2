/**
 * Tests — atomicité création utilisateur / lien owner_user.
 *
 * POST /api/delegations : avant ce correctif, l'utilisateur était créé puis le lien
 * owner_user inséré hors transaction (un échec du lien laissait un compte orphelin).
 * L'INSERT users visait de plus une colonne `password` inexistante (password_hash
 * partout ailleurs) — corrigé sur la même ligne.
 *
 * PUT /api/user-assignments/bulk/:userId : désactivation de tous les liens puis
 * réinsertion, hors transaction. Désormais BEGIN / ... / COMMIT, ROLLBACK sur échec.
 *
 * DB mockée : pool.query sert à `protect` et aux lectures hors transaction ;
 * pool.connect() renvoie un client dédié dont on inspecte la séquence.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import delegationRoutes from '../../routes/delegationRoutes';
import userAssignmentRoutes from '../../routes/userAssignmentRoutes';

const app = express();
app.use(express.json());
app.use('/api/delegations', delegationRoutes);
app.use('/api/user-assignments', userAssignmentRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const authToken = (role = 'proprietaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

let txClient: { query: jest.Mock; release: jest.Mock };
const txSql = () => txClient.query.mock.calls.map((c) => String(c[0]).trim());

beforeEach(() => {
    jest.clearAllMocks();
    txClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(txClient);
});

describe('POST /api/delegations — transaction utilisateur + lien', () => {
    const mockOwnerAndNoUser = () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 10 }] }) // getManagedOwnerId
            .mockResolvedValueOnce({ rows: [] });                // utilisateur inexistant
    };

    it('succès (nouvel utilisateur) → BEGIN, INSERT users (password_hash), INSERT owner_user, COMMIT', async () => {
        mockOwnerAndNoUser();
        txClient.query.mockImplementation(async (sql: string) =>
            sql.includes('INSERT INTO users') ? { rows: [{ id: 55 }] } : { rows: [] });

        const res = await request(app)
            .post('/api/delegations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ email: 'new@test.com', role: 'viewer' });

        expect(res.status).toBe(201);
        expect(res.body.isNewUser).toBe(true);
        const calls = txSql();
        expect(calls[0]).toBe('BEGIN');
        expect(calls[1]).toContain('INSERT INTO users (nom, email, password_hash,');
        expect(calls[2]).toContain('INSERT INTO owner_user');
        expect(calls[3]).toBe('COMMIT');
        expect(calls).not.toContain('ROLLBACK');
        expect(txClient.release).toHaveBeenCalledTimes(1);
        // Aucune écriture hors transaction
        const poolSql = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
        expect(poolSql.some((s) => s.includes('INSERT'))).toBe(false);
    });

    it('échec du lien owner_user → ROLLBACK (pas de compte orphelin), 500, client libéré', async () => {
        mockOwnerAndNoUser();
        txClient.query.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO users')) return { rows: [{ id: 55 }] };
            if (sql.includes('INSERT INTO owner_user')) throw new Error('link failed');
            return { rows: [] };
        });

        const res = await request(app)
            .post('/api/delegations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ email: 'new@test.com' });

        expect(res.status).toBe(500);
        const calls = txSql();
        expect(calls[0]).toBe('BEGIN');
        expect(calls).toContain('ROLLBACK');
        expect(calls).not.toContain('COMMIT');
        expect(txClient.release).toHaveBeenCalledTimes(1);
        expect(res.body.tempPassword).toBeUndefined();
    });

    it("utilisateur existant = appelant → 400 sans ouvrir de transaction", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 10 }] })
            .mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const res = await request(app)
            .post('/api/delegations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ email: 'me@test.com' });

        expect(res.status).toBe(400);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    it('utilisateur existant → BEGIN, INSERT owner_user seul, COMMIT', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 10 }] })
            .mockResolvedValueOnce({ rows: [{ id: 77 }] });
        txClient.query.mockResolvedValue({ rows: [] });

        const res = await request(app)
            .post('/api/delegations')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ email: 'other@test.com' });

        expect(res.status).toBe(201);
        expect(res.body.isNewUser).toBe(false);
        const calls = txSql();
        expect(calls).toHaveLength(3);
        expect(calls[0]).toBe('BEGIN');
        expect(calls[1]).toContain('INSERT INTO owner_user');
        expect(calls[2]).toBe('COMMIT');
    });
});

describe('PUT /api/user-assignments/bulk/:userId — transaction', () => {
    const assignments = [
        { owner_id: 1, role: 'viewer' },
        { owner_id: 2, role: 'viewer' },
    ];

    it('succès → BEGIN, UPDATE (désactivation), INSERT x2, COMMIT', async () => {
        mockAuthLookup();
        txClient.query.mockResolvedValue({ rows: [] });

        const res = await request(app)
            .put('/api/user-assignments/bulk/5')
            .set('Authorization', `Bearer ${authToken('super_admin')}`)
            .send({ assignments });

        expect(res.status).toBe(200);
        const calls = txSql();
        expect(calls[0]).toBe('BEGIN');
        expect(calls[1]).toContain('UPDATE owner_user SET is_active = false');
        expect(calls[2]).toContain('INSERT INTO owner_user');
        expect(calls[3]).toContain('INSERT INTO owner_user');
        expect(calls[4]).toBe('COMMIT');
        expect(txClient.release).toHaveBeenCalledTimes(1);
        expect((pool.query as jest.Mock).mock.calls.some((c) => String(c[0]).includes('owner_user'))).toBe(false);
    });

    it('échec de la 2e réinsertion → ROLLBACK (désactivation annulée), 500, client libéré', async () => {
        mockAuthLookup();
        let inserts = 0;
        txClient.query.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO owner_user') && ++inserts === 2) throw new Error('boom');
            return { rows: [] };
        });

        const res = await request(app)
            .put('/api/user-assignments/bulk/5')
            .set('Authorization', `Bearer ${authToken('super_admin')}`)
            .send({ assignments });

        expect(res.status).toBe(500);
        const calls = txSql();
        expect(calls[0]).toBe('BEGIN');
        expect(calls).toContain('ROLLBACK');
        expect(calls).not.toContain('COMMIT');
        expect(txClient.release).toHaveBeenCalledTimes(1);
    });

    it('rôle non super_admin → 403 sans transaction (inchangé)', async () => {
        mockAuthLookup();
        const res = await request(app)
            .put('/api/user-assignments/bulk/5')
            .set('Authorization', `Bearer ${authToken('admin')}`)
            .send({ assignments });

        expect(res.status).toBe(403);
        expect(pool.connect).not.toHaveBeenCalled();
    });
});
