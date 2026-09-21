/**
 * Tests d'intégration — Correctif lot 1b (audit sécurité, priorité)
 * PATCH /api/auth/complete-profile :
 *   - authentification obligatoire (`protect`), identité prise sur req.userId uniquement ;
 *   - un userId de corps différent du token est refusé (403), pas simplement ignoré ;
 *   - validation + normalisation E.164 du téléphone via libphonenumber-js (région BJ).
 * POST /api/auth/google :
 *   - email_verified strictement true exigé, avant toute requête SQL ;
 *   - liaison d'un compte existant non-Google à Google -> audit GOOGLE_ACCOUNT_LINKED dédié.
 */

// GOOGLE_CLIENT_ID est lu au chargement du module googleAuthRoutes.ts (avant tout mock) :
// doit être défini avant l'import plus bas, sinon la route répond 500 "non configuré".
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// googleAuthRoutes.ts importe AuditService, qui importe `pool` depuis `../index` (le point
// d'entrée du serveur, avec app.listen/helmet/etc.) — mocké pour ne charger que le routeur
// (même raison que tests/routes/compte.test.ts).
jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn() },
}));

// verifyIdToken mocké : une seule instance partagée, peu importe combien de fois
// `new OAuth2Client(...)` est appelé (googleAuthRoutes.ts le fait une fois au chargement).
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
    })),
}));

import pool from '../../db/database';
import { AuditService } from '../../services/AuditService';
import googleAuthRouter from '../../routes/googleAuthRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/auth', googleAuthRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

// email fourni dans le payload pour que authMiddleware saute le SELECT de secours
const pendingToken = (id = 117) =>
    jwt.sign({ id, role: 'pending', email: `pending${id}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

const validBody = { userType: 'gestionnaire', telephone: '01 97 00 00 00' };

describe('PATCH /api/auth/complete-profile — authentification et identité', () => {
    beforeEach(() => jest.clearAllMocks());

    it('sans token : 401, aucune requête déclenchée', async () => {
        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .send(validBody);

        expect(res.status).toBe(401);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it("userId du corps différent du token (tentative de prise de contrôle) : 403, aucune requête", async () => {
        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send({ ...validBody, userId: 36 }); // 117 tente de compléter le profil du compte 36

        expect(res.status).toBe(403);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it("userId du corps identique au token : accepté normalement (rétrocompatible avec le client actuel)", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 117, email: 'pending117@test.dev', nom: 'Test', user_type: 'gestionnaire', role: 'gestionnaire' }],
        });

        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send({ ...validBody, userId: 117 });

        expect(res.status).toBe(200);
    });

    it("profil déjà complété (plus au statut 'pending') : 404, message explicite", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // UPDATE ne matche aucune ligne

        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send(validBody);

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('déjà complété');
    });
});

describe('PATCH /api/auth/complete-profile — validation téléphone (libphonenumber-js, région BJ)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('téléphone local valide (nouveau format 01 XX XX XX XX) : 200, enregistré au format E.164', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 117, email: 'pending117@test.dev', nom: 'Test', user_type: 'gestionnaire', role: 'gestionnaire' }],
        });

        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send({ userType: 'gestionnaire', telephone: '01 97 00 00 00' });

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE users'),
            ['gestionnaire', '+2290197000000', 117],
        );
    });

    it('téléphone clairement invalide : 400 avec message et exemple de format', async () => {
        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send({ userType: 'gestionnaire', telephone: '123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Numéro de téléphone invalide');
        expect(res.body.message).toContain('+229');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('téléphone déjà utilisé par un autre compte : 409', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce({
            code: '23505',
            constraint: 'users_telephone_key',
        });

        const res = await request(app)
            .patch('/api/auth/complete-profile')
            .set('Authorization', `Bearer ${pendingToken(117)}`)
            .send({ userType: 'gestionnaire', telephone: '01 97 00 00 00' });

        expect(res.status).toBe(409);
    });
});

// ── POST /google ─────────────────────────────────────────────────────────────

const googlePayload = (overrides: Record<string, any> = {}) => ({
    sub: 'google-sub-id',
    email: 'user@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/pic.jpg',
    email_verified: true,
    ...overrides,
});

describe('POST /api/auth/google — email_verified et liaison de compte', () => {
    beforeEach(() => jest.clearAllMocks());

    it('email_verified: false -> 401, aucune requête SQL déclenchée', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email_verified: false }),
        });

        const res = await request(app)
            .post('/api/auth/google')
            .send({ credential: 'fake-credential' });

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('non vérifiée');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('email_verified: true, nouvel utilisateur : création comme avant', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'nouveau@example.com' }),
        });
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [] }) // SELECT par email -> personne
            .mockResolvedValueOnce({
                rows: [{ id: 200, email: 'nouveau@example.com', nom: 'Test User', user_type: 'pending', role: 'pending' }],
            }); // INSERT

        const res = await request(app)
            .post('/api/auth/google')
            .send({ credential: 'fake-credential' });

        expect(res.status).toBe(200);
        expect(res.body.needsProfileCompletion).toBe(true);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('INSERT INTO users'),
            expect.any(Array),
        );
        expect(AuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'GOOGLE_REGISTER' }),
        );
    });

    it("email_verified: true, compte email existant sans google_id : liaison + audit GOOGLE_ACCOUNT_LINKED", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'existant@example.com' }),
        });
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({
                rows: [{
                    id: 300, email: 'existant@example.com', nom: 'Existant',
                    user_type: 'gestionnaire', role: 'gestionnaire', google_id: null, statut: 'actif',
                }],
            }) // SELECT par email -> trouvé, pas encore lié à Google
            .mockResolvedValueOnce({ rows: [] }); // UPDATE google_id

        const res = await request(app)
            .post('/api/auth/google')
            .send({ credential: 'fake-credential' });

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('UPDATE users SET google_id'),
            expect.any(Array),
        );
        expect(AuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'GOOGLE_ACCOUNT_LINKED', userId: '300' }),
        );
        // La liaison ne remplace pas le log de connexion existant, elle s'y ajoute.
        expect(AuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'GOOGLE_LOGIN', userId: '300' }),
        );
    });
});
