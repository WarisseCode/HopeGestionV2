/**
 * Tests d'intégration — Correctif de sécurité IDOR sur les routes de bail
 * (GET /:id, PUT /:id, POST /:id/resilier, POST /:id/renouveler, POST /:id/sign).
 *
 * `leases` n'a pas de politique RLS versionnée et le rôle DB peut avoir BYPASSRLS
 * (même constat que edlRoutes.ts/inventoryRoutes.ts) : avant ce correctif, ces
 * routes lisaient/modifiaient un bail par son seul id, sans vérifier qu'il
 * appartient à un propriétaire géré par l'appelant. Le correctif ajoute un
 * filtre explicite `owner_id = ANY(validOwnerIds)` (scopeByOwner, repris du
 * pattern déjà utilisé dans edlRoutes.ts), contourné pour le rôle admin.
 *
 * DB mockée : ces tests ne vérifient pas un vrai filtrage SQL (impossible sans
 * base réelle), mais que la route CONSTRUIT bien la requête avec la clause et
 * les paramètres attendus (SQL + params), et se comporte correctement (404)
 * quand le filtre exclut la ligne.
 *
 * POST /:id/sign couvre en plus deux ajustements demandés après relecture :
 * la vérification d'accès se fait désormais AVANT l'écriture du fichier de
 * signature (plus de fichier orphelin pour un appel non autorisé), et le nom
 * de fichier généré est un jeton hexadécimal aléatoire, pas un timestamp.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// fs : POST /:id/sign écrit un fichier sur disque (signature PNG) — mocké pour
// ne jamais toucher le disque réel dans ces tests unitaires.
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

jest.mock('../../services/notificationService', () => ({
    NotificationService: { send: jest.fn() },
}));

// tenantGuard : dbClient pointe vers le même pool mocké, validOwnerIds exposé
// comme le fait le vrai middleware (voir tenantGuard.ts L83) pour que
// scopeByOwner() puisse filtrer.
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient        = poolModule.default;
            req.resolvedOwnerId = 1;
            req.validOwnerIds   = [1];
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
    checkPermission: (_m: string, _a: string) => (_req: any, _res: any, next: any) => next(),
    permissions: {
        canRead:     (_m: string) => (_req: any, _res: any, next: any) => next(),
        canWrite:    (_m: string) => (_req: any, _res: any, next: any) => next(),
        canDelete:   (_m: string) => (_req: any, _res: any, next: any) => next(),
        canValidate: (_m: string) => (_req: any, _res: any, next: any) => next(),
    },
}));

import pool from '../../db/database';
import fs from 'fs';
import { protect } from '../../middleware/authMiddleware';
import leaseRoutes from '../../routes/leaseRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/locations', protect, leaseRoutes);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

/** `protect` fait toujours un premier SELECT email avant que la route ne s'exécute. */
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

const TINY_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('GET /api/locations/:id — filtre owner_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('gestionnaire : la requête inclut owner_id = ANY(validOwnerIds)', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42 }] }); // fiche du bail
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });           // échéancier

        const res = await request(app)
            .get('/api/locations/42')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).toContain('l.owner_id = ANY(');
        expect(params[params.length - 1]).toEqual([1]);
    });

    it('admin : aucun filtre owner_id (accès global)', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42 }] });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/locations/42')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).not.toContain('owner_id = ANY(');
        expect(params).toEqual(['42']);
    });
});

describe('PUT /api/locations/:id — filtre owner_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('bail visible pour ce propriétaire : requête filtrée, 200', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42, statut: 'actif' }] });

        const res = await request(app)
            .put('/api/locations/42')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ statut: 'actif' });

        expect(res.status).toBe(200);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).toContain('owner_id = ANY(');
        expect(params[params.length - 1]).toEqual([1]);
    });

    it("bail d'un autre propriétaire (exclu par le filtre) → 404", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .put('/api/locations/42')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ statut: 'actif' });

        expect(res.status).toBe(404);
    });
});

describe('POST /api/locations/:id/resilier — filtre owner_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('bail visible : vérification ET mise à jour filtrées, 200', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ lot_id: 9 }] }); // vérification
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42 }] });    // UPDATE leases
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });              // UPDATE lots

        const res = await request(app)
            .post('/api/locations/42/resilier')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(200);

        const [checkSql, checkParams] = (pool.query as jest.Mock).mock.calls[1];
        expect(checkSql).toContain('owner_id = ANY(');
        expect(checkParams[checkParams.length - 1]).toEqual([1]);

        const [updateSql, updateParams] = (pool.query as jest.Mock).mock.calls[2];
        expect(updateSql).toContain('owner_id = ANY(');
        expect(updateParams[updateParams.length - 1]).toEqual([1]);
    });

    it("bail d'un autre propriétaire → 404 dès la vérification, aucune mise à jour", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // vérification exclut la ligne

        const res = await request(app)
            .post('/api/locations/42/resilier')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(2); // auth + vérification seulement
    });
});

describe('POST /api/locations/:id/renouveler — filtre owner_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('bail visible : requête filtrée, 200', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42, statut: 'actif' }] });

        const res = await request(app)
            .post('/api/locations/42/renouveler')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(200);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).toContain('owner_id = ANY(');
        expect(params[params.length - 1]).toEqual([1]);
    });

    it("bail d'un autre propriétaire (exclu par le filtre) → 404", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/locations/42/renouveler')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({});

        expect(res.status).toBe(404);
    });
});

describe('POST /api/locations/:id/sign — filtre owner_id, vérifié avant écriture', () => {
    beforeEach(() => jest.clearAllMocks());

    it('bail visible : vérification préalable filtrée, puis écriture, puis mise à jour filtrée, 200', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 42 }] }); // vérification préalable
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 42, reference_bail: 'BAIL-2026-0001', owner_id: 1 }],
        }); // UPDATE leases ... RETURNING
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // owner_user (pas de notif)

        const res = await request(app)
            .post('/api/locations/42/sign')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ signatureImage: TINY_PNG_DATA_URL });

        expect(res.status).toBe(200);

        const [checkSql, checkParams] = (pool.query as jest.Mock).mock.calls[1];
        expect(checkSql).toContain('owner_id = ANY(');
        expect(checkParams[checkParams.length - 1]).toEqual([1]);

        const [updateSql, updateParams] = (pool.query as jest.Mock).mock.calls[2];
        expect(updateSql).toContain('owner_id = ANY(');
        expect(updateParams[updateParams.length - 1]).toEqual([1]);

        // Le fichier de signature n'est écrit qu'après la vérification, avec un
        // nom opaque (jeton hexadécimal), pas un timestamp devinable.
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        expect(res.body.signatureUrl).toMatch(/^\/uploads\/signatures\/signature_42_[0-9a-f]{32}\.png$/);
    });

    it("bail d'un autre propriétaire (exclu par le filtre) → 404 AVANT toute écriture de fichier", async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // vérification préalable exclut la ligne

        const res = await request(app)
            .post('/api/locations/42/sign')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ signatureImage: TINY_PNG_DATA_URL });

        expect(res.status).toBe(404);
        // Le point central du correctif : plus aucun fichier orphelin déposé sur
        // disque pour un bail non autorisé.
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        // Un seul appel après l'auth : la vérification préalable. Pas d'UPDATE.
        expect(pool.query).toHaveBeenCalledTimes(2);
    });
});
