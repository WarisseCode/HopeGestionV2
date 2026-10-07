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

// Même bug que /mobile/google (T-022), sur la route web : aucun statut n'était vérifié.
describe('POST /api/auth/google — compte inactif / suspendu', () => {
    // Espion sur jwt.sign (même objet module que celui utilisé par la route) : prouve
    // qu'aucun token n'est émis en interne, pas seulement absent de la réponse.
    let signSpy: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        signSpy = jest.spyOn(jwt, 'sign');
    });
    afterEach(() => signSpy.mockRestore());

    const existingRow = (statut: string, google_id: string | null) => ({
        id: 400, email: 'existant@example.com', nom: 'Existant',
        user_type: 'gestionnaire', role: 'gestionnaire', google_id, statut,
    });

    const blockedStatuses = ['Suspendu', 'suspendu', 'SUSPENDU', ' suspendu ', 'Inactif', 'INACTIF '];

    it.each(blockedStatuses)(
        'compte déjà lié à Google, statut "%s" : 401, aucun token émis',
        async (statut) => {
            mockVerifyIdToken.mockResolvedValueOnce({
                getPayload: () => googlePayload({ email: 'existant@example.com' }),
            });
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [existingRow(statut, 'google-sub-id')],
            });

            const res = await request(app)
                .post('/api/auth/google')
                .send({ credential: 'fake-credential' });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('inactif ou suspendu');
            expect(res.body.token).toBeUndefined();
            expect(signSpy).not.toHaveBeenCalled();
            // Seule la lecture du compte : aucun UPDATE, aucun audit de connexion.
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(AuditService.log).not.toHaveBeenCalled();
        },
    );

    it.each(blockedStatuses)(
        'compte non lié à Google, statut "%s" : 401, aucune liaison google_id, aucun token',
        async (statut) => {
            mockVerifyIdToken.mockResolvedValueOnce({
                getPayload: () => googlePayload({ email: 'existant@example.com' }),
            });
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [existingRow(statut, null)],
            });

            const res = await request(app)
                .post('/api/auth/google')
                .send({ credential: 'fake-credential' });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('inactif ou suspendu');
            expect(res.body.token).toBeUndefined();
            expect(signSpy).not.toHaveBeenCalled();
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query).not.toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET google_id'),
                expect.anything(),
            );
            expect(AuditService.log).not.toHaveBeenCalled();
        },
    );

    it.each(['Actif', 'actif'])(
        'statut "%s" (compte déjà lié) : connexion non bloquée, token émis',
        async (statut) => {
            mockVerifyIdToken.mockResolvedValueOnce({
                getPayload: () => googlePayload({ email: 'existant@example.com' }),
            });
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [existingRow(statut, 'google-sub-id')],
            });

            const res = await request(app)
                .post('/api/auth/google')
                .send({ credential: 'fake-credential' });

            expect(res.status).toBe(200);
            expect(typeof res.body.token).toBe('string');
            expect(signSpy).toHaveBeenCalledTimes(1);
            expect(AuditService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'GOOGLE_LOGIN', userId: '400' }),
            );
        },
    );

    it('statut "Actif" (compte non lié) : liaison google_id effectuée, token émis', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'existant@example.com' }),
        });
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [existingRow('Actif', null)] })
            .mockResolvedValueOnce({ rows: [] }); // UPDATE google_id

        const res = await request(app)
            .post('/api/auth/google')
            .send({ credential: 'fake-credential' });

        expect(res.status).toBe(200);
        expect(typeof res.body.token).toBe('string');
        expect(signSpy).toHaveBeenCalledTimes(1);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('UPDATE users SET google_id'),
            expect.any(Array),
        );
    });
});

// ── POST /mobile/google ──────────────────────────────────────────────────────

describe('POST /api/auth/mobile/google', () => {
    beforeEach(() => jest.clearAllMocks());

    const gestionnaireRow = {
        id: 42, role: 'gestionnaire', user_type: 'gestionnaire', statut: 'actif',
    };

    it('jeton valide, gestionnaire existant : 200, format identique à /mobile/login', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'gestionnaire@example.com' }),
        });
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [gestionnaireRow] }) // SELECT par email
            .mockResolvedValueOnce({ rows: [] }); // INSERT refresh_tokens (issueTokenPair)

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: 'Connexion réussie.',
            token: expect.any(String),
            refreshToken: expect.any(String),
            role: 'gestionnaire',
            userId: 42,
        });
        expect(AuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'GOOGLE_LOGIN_MOBILE', userId: '42' }),
        );
        // Aucune création de compte sur ce canal : une seule requête de lecture
        // avant l'émission des tokens (pas d'INSERT/UPDATE users).
        expect(pool.query).toHaveBeenNthCalledWith(
            1, expect.stringContaining('SELECT'), ['gestionnaire@example.com'],
        );
    });

    it('jeton Google invalide (verifyIdToken rejette) : 401, aucune requête SQL', async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token signature'));

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'malformed' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Jeton Google invalide.');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('audience incorrecte (verifyIdToken rejette "Wrong recipient") : 401, même message, pas le détail', async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error('Wrong recipient, payload audience != requiredAudience'));

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'wrong-audience' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Jeton Google invalide.');
        expect(res.body.message).not.toContain('audience');
    });

    it('email non vérifié : 401, aucune requête SQL', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email_verified: false }),
        });

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('non vérifiée');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('email inconnu : 404, aucune création de compte', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'inconnu@example.com' }),
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // SELECT -> personne

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain("n'existe");
        // Une seule requête (la lecture) : jamais d'INSERT.
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('rôle non pris en charge (locataire) : 403, aucun token émis', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'locataire@example.com' }),
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 55, role: 'locataire', user_type: 'locataire', statut: 'actif' }],
        });

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('pas pris en charge');
        // Une seule requête (la lecture) : pas d'émission de tokens (pas d'INSERT refresh_tokens).
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('compte suspendu : 401, aucun token émis', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'suspendu@example.com' }),
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 60, role: 'gestionnaire', user_type: 'gestionnaire', statut: 'suspendu' }],
        });

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(401);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    // Bug lié découvert pendant C3 (pas une faille "C" de l'audit initial) : /suspend écrit
    // 'Suspendu' (majuscule) et la comparaison stricte laissait passer la connexion Google.
    it.each(['Suspendu', 'suspendu', 'SUSPENDU', ' suspendu ', 'Inactif', 'INACTIF '])(
        'statut "%s" (casse / espaces variables) : 401, aucun token émis',
        async (statut) => {
            mockVerifyIdToken.mockResolvedValueOnce({
                getPayload: () => googlePayload({ email: 'suspendu@example.com' }),
            });
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 61, role: 'gestionnaire', user_type: 'gestionnaire', statut }],
            });

            const res = await request(app)
                .post('/api/auth/mobile/google')
                .send({ idToken: 'fake-id-token' });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('inactif ou suspendu');
            expect(res.body.token).toBeUndefined();
            expect(res.body.refreshToken).toBeUndefined();
            // Seule la lecture du compte : pas d'INSERT refresh_tokens, pas d'audit de connexion.
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(AuditService.log).not.toHaveBeenCalled();
        },
    );

    it('statut "Actif" (écrit par /reactivate) : connexion Google non bloquée par le statut', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => googlePayload({ email: 'gestionnaire@example.com' }),
        });
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ ...gestionnaireRow, statut: 'Actif' }] })
            .mockResolvedValueOnce({ rows: [] }); // INSERT refresh_tokens

        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({ idToken: 'fake-id-token' });

        expect(res.status).toBe(200);
        expect(res.body.token).toEqual(expect.any(String));
    });

    it('idToken manquant : 400 (validation), aucune requête', async () => {
        const res = await request(app)
            .post('/api/auth/mobile/google')
            .send({});

        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
        expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });
});
