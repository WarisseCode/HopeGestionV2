/**
 * Tests d'intégration — Correctif de sécurité : escalade de privilèges à l'inscription
 * (POST /api/auth/register).
 *
 * Avant ce correctif, AuthService.register écrivait `userType` fourni par le client
 * directement dans users.user_type ET users.role, sans liste blanche :
 * { userType: 'admin' } + validation OTP donnait un compte admin.
 *
 * Le correctif ajoute deux barrières indépendantes :
 *  - route : registerRules valide userType avec isIn(['gestionnaire','proprietaire','locataire'])
 *    (même liste que completeProfileRules dans googleAuthRoutes.ts) ;
 *  - service : AuthService.register revérifie avec sa propre liste blanche fixe
 *    (défense en profondeur si register() était appelé hors de cette route).
 *
 * DB mockée : on vérifie qu'aucun INSERT n'est émis pour une valeur interdite et que
 * la valeur écrite (user_type = role, paramètre $5) est bien celle attendue.
 */

import request from 'supertest';
import express from 'express';

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
import { authService, AuthError } from '../../services/AuthService';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const basePayload = {
    nom: 'Dupont',
    prenoms: 'Jean',
    email: 'jean.dupont@test.com',
    telephone: '+22901020304',
    password: 'MotDePasse1!',
};

// Index du paramètre user_type/role ($5) dans l'INSERT de AuthService.register.
const USER_TYPE_PARAM_INDEX = 4;

const insertUserCalls = () =>
    (pool.query as jest.Mock).mock.calls.filter(([sql]) => /INSERT INTO users/i.test(sql));

// ── Route : POST /api/auth/register ──────────────────────────────────────────

describe('POST /api/auth/register — liste blanche userType (escalade de privilèges)', () => {
    beforeEach(() => jest.clearAllMocks());

    it.each(['admin', 'super_admin', 'manager', 'pending', 'ADMIN'])(
        'rejette userType "%s" en 400 sans aucun INSERT',
        async (forbidden) => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...basePayload, userType: forbidden });

            expect(res.status).toBe(400);
            expect(insertUserCalls()).toHaveLength(0);
        }
    );

    it('rejette userType sous forme de tableau ["admin"] en 400 sans aucun INSERT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...basePayload, userType: ['admin'] });

        expect(res.status).toBe(400);
        expect(insertUserCalls()).toHaveLength(0);
    });

    it.each(['gestionnaire', 'proprietaire', 'locataire'])(
        'accepte userType autorisé "%s" et l\'écrit tel quel dans user_type/role',
        async (allowed) => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 99 }] });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...basePayload, userType: allowed });

            expect(res.status).toBe(201);
            const calls = insertUserCalls();
            expect(calls).toHaveLength(1);
            expect(calls[0][1][USER_TYPE_PARAM_INDEX]).toBe(allowed);
        }
    );

    it('userType absent : compte créé en "gestionnaire" (comportement historique)', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 99 }] });

        const res = await request(app).post('/api/auth/register').send(basePayload);

        expect(res.status).toBe(201);
        expect(insertUserCalls()[0][1][USER_TYPE_PARAM_INDEX]).toBe('gestionnaire');
    });
});

// ── Service : défense en profondeur (hors validation de route) ───────────────

describe('AuthService.register — défense en profondeur userType', () => {
    beforeEach(() => jest.clearAllMocks());

    it('appel direct avec userType "admin" : AuthError 400, aucun INSERT', async () => {
        const err = await authService
            .register({ ...basePayload, userType: 'admin' }, '127.0.0.1', 'jest')
            .catch((e: unknown) => e);
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).status).toBe(400);

        expect(insertUserCalls()).toHaveLength(0);
    });

    it('appel direct avec une valeur non-string : AuthError 400, aucun INSERT', async () => {
        await expect(
            authService.register({ ...basePayload, userType: ['admin'] as any }, '127.0.0.1', 'jest')
        ).rejects.toMatchObject({ status: 400 });

        expect(insertUserCalls()).toHaveLength(0);
    });

    it('appel direct sans userType : INSERT avec "gestionnaire"', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 7 }] });

        const { userId } = await authService.register({ ...basePayload }, '127.0.0.1', 'jest');

        expect(userId).toBe(7);
        expect(insertUserCalls()[0][1][USER_TYPE_PARAM_INDEX]).toBe('gestionnaire');
    });
});
