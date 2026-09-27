/**
 * Tests d'intégration — Correctif RLS `POST /api/biens/lots`
 * (T-002/T-033, diagnostic utilisateur via `\d+ lots` : la policy RLS sur
 * `lots` exige `owner_id = get_current_owner_id()`. `owner_id` était
 * jusque-là résolu depuis `req.resolvedOwnerId` (session courante,
 * tenantGuard) plutôt qu'hérité de l'immeuble parent — NULL dans certains
 * modes de résolution (ex. gestionnaire multi-propriétaires sans owner_id
 * re-fourni dans CETTE requête précise), rejeté par la policy même quand
 * l'immeuble parent, lui, a un owner_id valide.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

let mockResolvedOwnerId: number | null = null;

// tenantGuard mocké : dbClient pointe vers le même pool mocké (même pattern que
// mobileMoney.test.ts/ticket.test.ts). resolvedOwnerId volontairement différent
// de l'owner_id réel de l'immeuble dans les tests ci-dessous, pour prouver que
// la route ne s'appuie plus dessus pour `lots.owner_id`.
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient = poolModule.default;
            req.validOwnerIds = [];
            req.resolvedOwnerId = mockResolvedOwnerId;
            next();
        },
    };
});

// permissions.canWrite/canRead et checkPropertyLimit : hors périmètre de ce
// correctif (déjà testés/couverts ailleurs), court-circuités pour isoler la
// logique d'héritage d'owner_id sur /lots.
jest.mock('../../middleware/permissionMiddleware', () => ({
    __esModule: true,
    default: {
        canRead: () => (_req: any, _res: any, next: any) => next(),
        canWrite: () => (_req: any, _res: any, next: any) => next(),
        canDelete: () => (_req: any, _res: any, next: any) => next(),
        canValidate: () => (_req: any, _res: any, next: any) => next(),
    },
}));

jest.mock('../../middleware/subscriptionLimits', () => ({
    __esModule: true,
    checkPropertyLimit: (_req: any, _res: any, next: any) => next(),
}));

import pool from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import bienRouter from '../../routes/bienRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/biens', protect, bienRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire', id = 7) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

// ── POST /lots ───────────────────────────────────────────────────────────────

describe('POST /api/biens/lots — owner_id hérité de l\'immeuble parent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolvedOwnerId = null; // simule le cas réel signalé : session sans owner_id résolu
    });

    it('crée le lot avec owner_id = celui de l\'immeuble parent, pas resolvedOwnerId', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 3 }] }) // SELECT owner_id FROM buildings
            .mockResolvedValueOnce({
                rows: [{ id: 42, building_id: 5, owner_id: 3, ref_lot: 'A01' }],
            }); // INSERT

        const res = await request(app)
            .post('/api/biens/lots')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ building_id: 5, reference: 'A01' });

        expect(res.status).toBe(200);
        expect(res.body.owner_id).toBe(3);

        // 1er appel : lookup de l'immeuble parent.
        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('SELECT owner_id FROM buildings'),
            [5],
        );
        // 2e appel : l'INSERT — owner_id (2e paramètre positionnel) doit être
        // celui de l'immeuble (3), jamais resolvedOwnerId (null ici).
        const insertCall = (pool.query as jest.Mock).mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO lots');
        expect(insertCall[1][0]).toBe(5); // building_id
        expect(insertCall[1][1]).toBe(3); // owner_id hérité, pas null
    });

    it('immeuble introuvable ou non visible par RLS : 400, pas d\'INSERT', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // aucune ligne (RLS ou id inexistant)

        const res = await request(app)
            .post('/api/biens/lots')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ building_id: 999, reference: 'A01' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Immeuble invalide');
        expect(pool.query).toHaveBeenCalledTimes(1); // jamais d'INSERT
    });

    it(
        'même quand resolvedOwnerId est différent de l\'owner de l\'immeuble ' +
            '(ex. multi-propriétaires), owner_id inséré reste celui de l\'immeuble',
        async () => {
            mockResolvedOwnerId = 99; // valeur délibérément différente
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ owner_id: 3 }] })
                .mockResolvedValueOnce({ rows: [{ id: 43, owner_id: 3 }] });

            const res = await request(app)
                .post('/api/biens/lots')
                .set('Authorization', `Bearer ${authToken()}`)
                .send({ building_id: 5, reference: 'A02' });

            expect(res.status).toBe(200);
            const insertCall = (pool.query as jest.Mock).mock.calls[1];
            expect(insertCall[1][1]).toBe(3); // pas 99
        },
    );
});

// ── Correctifs immeubles (T-005) ─────────────────────────────────────────────

describe('POST /api/biens/immeubles — mise à jour, owner_id jamais écrasé par NULL', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolvedOwnerId = null;
    });

    it('sans owner_id résolu : COALESCE conserve le propriétaire existant', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 5, nom: 'Résidence', owner_id: 3 }],
        });

        const res = await request(app)
            .post('/api/biens/immeubles')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ id: 5, nom: 'Résidence' });

        expect(res.status).toBe(200);
        expect(res.body.owner_id).toBe(3);
        const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
        expect(sql).toContain('UPDATE buildings');
        expect(sql).toContain('owner_id = COALESCE($7, owner_id)');
        expect(params[6]).toBeNull(); // $7 : NULL → COALESCE garde owner_id
    });

    it('avec owner_id résolu : la valeur résolue est bien transmise', async () => {
        mockResolvedOwnerId = 8;
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 5, owner_id: 8 }] });

        await request(app)
            .post('/api/biens/immeubles')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ id: 5, nom: 'Résidence', owner_id: 8 });

        const [, params] = (pool.query as jest.Mock).mock.calls[0];
        expect(params[6]).toBe(8);
    });
});

describe('POST /api/biens/immeubles — nombre_etages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolvedOwnerId = 3;
        (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });
    });

    const etagesEnvoyes = async (body: Record<string, unknown>) => {
        await request(app)
            .post('/api/biens/immeubles')
            .set('Authorization', `Bearer ${authToken()}`)
            .send({ nom: 'Résidence', ...body });
        // $16 dans l'INSERT comme dans l'UPDATE.
        return (pool.query as jest.Mock).mock.calls[0][1][15];
    };

    it('création : 0 (plain-pied) est conservé', async () => {
        expect(await etagesEnvoyes({ nombre_etages: 0 })).toBe(0);
    });

    it('mise à jour : 0 (plain-pied) est conservé', async () => {
        expect(await etagesEnvoyes({ id: 5, nombre_etages: 0 })).toBe(0);
    });

    it('valeur fournie conservée', async () => {
        expect(await etagesEnvoyes({ nombre_etages: 4 })).toBe(4);
    });

    it.each([
        ['absent', {}],
        ['null', { nombre_etages: null }],
        ['chaîne vide', { nombre_etages: '' }],
    ])('%s : repli sur 1', async (_label, body) => {
        expect(await etagesEnvoyes(body)).toBe(1);
    });
});

describe('GET /api/biens/immeubles — lots en corbeille et état d\'occupation', () => {
    beforeEach(() => jest.clearAllMocks());

    it('filtre la corbeille dans la jointure, pas dans le WHERE', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/biens/immeubles')
            .set('Authorization', `Bearer ${authToken()}`);

        const [sql] = (pool.query as jest.Mock).mock.calls[0];
        expect(sql).toMatch(/LEFT JOIN lots l ON l\.building_id = b\.id AND l\.deleted_at IS NULL/);
        // Le WHERE ne filtre que les immeubles supprimés : un immeuble sans lot
        // actif reste listé (LEFT JOIN).
        const whereClause = sql.slice(sql.indexOf('WHERE b.deleted_at'), sql.indexOf('GROUP BY'));
        expect(whereClause).not.toContain('l.deleted_at');
    });

    it('aucun lot créé → Vide, même avec une capacité déclarée ; lotsCrees ajouté', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [
                // capacité 20, aucun lot créé
                { id: 1, nom: 'A', total_lots: 20, nb_lots: '0', lots_occupes: '0' },
                // pas de capacité, 3 lots tous occupés
                { id: 2, nom: 'B', total_lots: 0, nb_lots: '3', lots_occupes: '3' },
                // capacité 10, 4 lots dont 2 occupés
                { id: 3, nom: 'C', total_lots: 10, nb_lots: '4', lots_occupes: '2' },
            ],
        });

        const res = await request(app)
            .get('/api/biens/immeubles')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        const [a, b, c] = res.body.immeubles;

        expect(a).toMatchObject({ etatOccupation: 'Vide', lotsCrees: 0, nbLots: 20, occupation: 0 });
        expect(b).toMatchObject({ etatOccupation: 'Complet', lotsCrees: 3, nbLots: 3, occupation: 100 });
        // Champs existants inchangés (utilisés par le web) : nbLots = capacité,
        // occupation calculée sur la capacité.
        expect(c).toMatchObject({ etatOccupation: 'En location', lotsCrees: 4, nbLots: 10, occupation: 20 });
    });
});
