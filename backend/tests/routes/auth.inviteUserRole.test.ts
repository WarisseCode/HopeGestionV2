/**
 * Tests d'intégration — Correctif de sécurité C2 : escalade de privilèges via invitation
 * (POST /api/auth/invite-user).
 *
 * Avant ce correctif, la route n'était protégée que par verifyToken : tout compte connecté
 * (locataire inclus) choisissait librement `role`, et /accept-invite activait ensuite le
 * compte avec ce rôle → n'importe qui pouvait créer un admin.
 *
 * Le correctif ajoute :
 *  - un contrôle du rôle de l'appelant (admin / gestionnaire / proprietaire, comme
 *    POST /api/compte/utilisateurs) → 403 sinon ;
 *  - une liste blanche stricte du rôle invité (isIn) → 400 pour toute valeur inconnue ;
 *  - une règle hiérarchique : seul un admin invite un admin (ou un rôle de gestion) → 403.
 *
 * DB mockée : on vérifie qu'aucun INSERT n'est émis quand la requête est refusée.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

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
    hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
}));

import pool from '../../db/database';
import authRouter from '../../routes/authRoutes';
import { JWT_SECRET } from '../../config/config';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const tokenFor = (role: string, id = 1) =>
    jwt.sign({ id, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

const basePayload = {
    nom: 'Dupont',
    prenom: 'Jean',
    telephone: '+22901020304',
};

let mockClient: { query: jest.Mock; release: jest.Mock };

/** Simule une DB où l'email/téléphone est libre et la transaction réussit. */
const mockSuccessfulInvite = () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // SELECT doublon
    mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
            if (/INSERT INTO users/i.test(sql)) return Promise.resolve({ rows: [{ id: 555 }] });
            return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
};

/** Tous les INSERT émis (pool direct + client transactionnel). */
const insertCalls = () => [
    ...(pool.query as jest.Mock).mock.calls,
    ...(mockClient?.query.mock.calls ?? []),
].filter(([sql]) => /INSERT INTO/i.test(sql));

const invite = (role: string, body: Record<string, unknown>) =>
    request(app)
        .post('/api/auth/invite-user')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .send({ ...basePayload, ...body });

describe('POST /api/auth/invite-user — contrôle de rôle (faille C2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = { query: jest.fn(), release: jest.fn() };
    });

    it('sans token : 401', async () => {
        const res = await request(app).post('/api/auth/invite-user').send({ ...basePayload, role: 'admin' });
        expect(res.status).toBe(401);
        expect(insertCalls()).toHaveLength(0);
    });

    it.each(['locataire', 'comptable', 'agent_recouvreur', 'prestataire', 'manager', 'guest', 'viewer'])(
        'appelant "%s" qui invite un admin : 403 sans aucun INSERT',
        async (callerRole) => {
            const res = await invite(callerRole, { role: 'admin' });
            expect(res.status).toBe(403);
            expect(insertCalls()).toHaveLength(0);
            expect(pool.query).not.toHaveBeenCalled();
        }
    );

    it.each(['gestionnaire', 'proprietaire'])(
        'appelant "%s" qui invite un admin : 403 sans aucun INSERT',
        async (callerRole) => {
            const res = await invite(callerRole, { role: 'admin' });
            expect(res.status).toBe(403);
            expect(insertCalls()).toHaveLength(0);
        }
    );

    it.each(['gestionnaire', 'manager'])(
        'gestionnaire qui invite un rôle de même niveau "%s" : 403',
        async (targetRole) => {
            const res = await invite('gestionnaire', { role: targetRole });
            expect(res.status).toBe(403);
            expect(insertCalls()).toHaveLength(0);
        }
    );

    it.each(['super_admin', 'ADMIN', 'pending', 'locataire', 'proprietaire'])(
        'admin avec un rôle hors liste blanche "%s" : 400',
        async (badRole) => {
            const res = await invite('admin', { role: badRole });
            expect(res.status).toBe(400);
            expect(insertCalls()).toHaveLength(0);
        }
    );

    it('rôle sous forme de tableau ["admin"] : 400', async () => {
        const res = await invite('admin', { role: ['admin'] });
        expect(res.status).toBe(400);
        expect(insertCalls()).toHaveLength(0);
    });

    it('rôle absent : 400', async () => {
        const res = await invite('admin', {});
        expect(res.status).toBe(400);
        expect(insertCalls()).toHaveLength(0);
    });

    it('admin qui invite un admin : 201, rôle "admin" écrit dans users et user_invitations', async () => {
        mockSuccessfulInvite();
        const res = await invite('admin', { role: 'admin' });

        expect(res.status).toBe(201);
        expect(res.body.userId).toBe(555);

        const userInsert = mockClient.query.mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
        expect(userInsert![1][4]).toBe('admin');
        const inviteInsert = mockClient.query.mock.calls.find(([sql]) => /INSERT INTO user_invitations/i.test(sql));
        expect(inviteInsert![1][2]).toBe('admin');
    });

    it.each([
        ['gestionnaire', 'comptable'],
        ['proprietaire', 'agent_recouvreur'],
        ['admin', 'gestionnaire'],
    ])('appelant "%s" qui invite un "%s" : 201', async (callerRole, targetRole) => {
        mockSuccessfulInvite();
        const res = await invite(callerRole, { role: targetRole });

        expect(res.status).toBe(201);
        const userInsert = mockClient.query.mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
        expect(userInsert![1][4]).toBe(targetRole);
    });
});
