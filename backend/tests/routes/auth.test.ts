/**
 * Tests d'intégration — Routes d'authentification (/api/auth)
 * Couvre : login, refresh (cookie httpOnly), logout, register (champs requis).
 * La DB et les services tiers sont mockés — pas de connexion réelle.
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
    default: {
        sendEmail: jest.fn().mockResolvedValue(undefined),
        sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('bcrypt', () => ({
    ...jest.requireActual('bcrypt'),
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
}));

import bcrypt from 'bcrypt';
import pool from '../../db/database';
import authRouter from '../../routes/authRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const mockUserRow = {
    id: 42,
    password_hash: '$2b$10$hashed',
    role: 'gestionnaire',
    user_type: 'gestionnaire',
    statut: 'actif',
    is_verified: true,
};

const validToken = () =>
    jwt.sign({ id: 42, role: 'gestionnaire', userType: 'gestionnaire' }, JWT_SECRET, { expiresIn: '1h' });

// ── POST /login ───────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie 400 si email manquant', async () => {
        const res = await request(app).post('/api/auth/login').send({ password: 'pass123' });
        expect(res.status).toBe(400);
    });

    it('renvoie 400 si mot de passe manquant', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com' });
        expect(res.status).toBe(400);
    });

    it('renvoie 400 si format email invalide', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'pas-un-email', password: 'pass123' });
        expect(res.status).toBe(400);
    });

    it('renvoie 401 si utilisateur introuvable', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'inconnu@test.com', password: 'pass123' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/incorrect/i);
    });

    it('renvoie 401 si mot de passe incorrect', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUserRow] });
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'mauvais' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/incorrect/i);
    });

    it('renvoie 403 si email non vérifié', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ ...mockUserRow, is_verified: false }],
        });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'pass123' });
        expect(res.status).toBe(403);
        expect(res.body.isVerified).toBe(false);
    });

    it('connecte avec succès : body contient token sans refreshToken, cookie httpOnly posé', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [mockUserRow] }) // SELECT user
            .mockResolvedValueOnce({ rows: [] });           // INSERT refresh_token
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'correct' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).not.toHaveProperty('refreshToken'); // Plus dans le body

        const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
        expect(cookies.some(c => c.toLowerCase().includes('httponly'))).toBe(true);
        expect(cookies.some(c => c.toLowerCase().includes('samesite=strict'))).toBe(true);
    });
});

// ── POST /refresh ─────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie 400 si aucun cookie refreshToken', async () => {
        const res = await request(app).post('/api/auth/refresh').send();
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/manquant/i);
    });

    it('renvoie 401 si refresh token inconnu ou révoqué', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // UPDATE RETURNING → 0 rows
        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', 'refreshToken=tokenInvalide');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalide|expiré/i);
    });

    it('émet un nouvel access token et renouvelle le cookie sur refresh valide', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({
                rows: [{ user_id: 42, role: 'gestionnaire', user_type: 'gestionnaire' }],
            })                             // UPDATE refresh_tokens RETURNING
            .mockResolvedValueOnce({ rows: [] }); // INSERT nouveau refresh_token

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', 'refreshToken=tokenValide');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).not.toHaveProperty('refreshToken'); // Plus dans le body

        const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
        expect(cookies.some(c => c.toLowerCase().includes('httponly'))).toBe(true);
    });
});

// ── POST /logout ──────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renvoie 200 même sans cookie (déconnexion partielle tolérée)', async () => {
        const res = await request(app).post('/api/auth/logout').send();
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/déconnexion/i);
    });

    it('révoque le token en DB et efface le cookie quand le cookie est présent', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // UPDATE revoke

        const res = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', 'refreshToken=tokenARevoquer');

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenCalledTimes(1);
        expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/revoked_at/i);

        // Le cookie doit être effacé (max-age=0 ou expires dans le passé)
        const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
        if (cookies) {
            const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
            expect(refreshCookie).toBeDefined();
            const hasExpired =
                refreshCookie?.toLowerCase().includes('max-age=0') ||
                refreshCookie?.toLowerCase().includes('expires=');
            expect(hasExpired).toBe(true);
        }
    });
});

// ── POST /register ────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    beforeEach(() => jest.clearAllMocks());

    const validPayload = {
        nom: 'Dupont',
        prenoms: 'Jean',
        email: 'jean.dupont@test.com',
        telephone: '+22901020304',
        password: 'MotDePasse1!',
        userType: 'gestionnaire',
    };

    it('renvoie 400 si champs requis manquants', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'x@x.com', password: 'pass' }); // nom et telephone manquants
        expect(res.status).toBe(400);
    });

    it('renvoie 409 si email déjà utilisé (contrainte UNIQUE DB)', async () => {
        // La route fait directement un INSERT et capture l'erreur 23505 de PostgreSQL
        const dbError = Object.assign(new Error('duplicate key'), { code: '23505' });
        (pool.query as jest.Mock).mockRejectedValueOnce(dbError);
        const res = await request(app).post('/api/auth/register').send(validPayload);
        expect(res.status).toBe(409);
    });

    it('crée le compte et renvoie 201 avec les champs attendus', async () => {
        // INSERT users RETURNING id — une seule query avant l'AuditService.log
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 99 }] });
        (bcrypt.hash as jest.Mock).mockResolvedValueOnce('$2b$10$hashed');

        const res = await request(app).post('/api/auth/register').send(validPayload);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('message');
    });
});
