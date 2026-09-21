/**
 * Tests d'intégration — Correctifs failles #2 et #4 (audit RLS T-011)
 * GET /api/tickets : tickets n'a pas de policy RLS forcée -> isolation applicative
 * explicite par owner_id, requise ici.
 * POST /api/tickets : IDOR — owner_id déduit du lot_id, mais rien ne vérifiait que
 * l'appelant a un droit réel sur ce lot avant création.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

let mockValidOwnerIds: number[] = [];

// tenantGuard mocké : dbClient pointe vers le même pool mocké (POST / n'utilise pas
// tenantGuard du tout — il passe par le pool brut directement, comme en prod).
jest.mock('../../middleware/tenantGuard', () => {
    const poolModule = require('../../db/database');
    return {
        tenantGuard: (req: any, _res: any, next: any) => {
            req.dbClient = poolModule.default;
            req.validOwnerIds = mockValidOwnerIds;
            next();
        },
    };
});

import pool from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import ticketRouter from '../../routes/ticketRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/tickets', protect, ticketRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire', id = 1) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

// ── GET / ────────────────────────────────────────────────────────────────────

describe('GET /api/tickets — isolation par owner_id', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidOwnerIds = [1];
    });

    it("gestionnaire de l'agence A : reçoit ses tickets, filtrés par ses owners", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })          // COUNT
            .mockResolvedValueOnce({ rows: [{ id: 5, owner_id: 1 }] }); // SELECT

        const res = await request(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([{ id: 5, owner_id: 1 }]);
        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('t.owner_id = ANY($1::int[])'),
            [[1]],
        );
    });

    it("gestionnaire sans owner lié (autre agence) : liste vide, aucune requête déclenchée", async () => {
        mockValidOwnerIds = [];

        const res = await request(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${authToken('gestionnaire')}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('admin : accès non filtré (toutes agences)', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ count: '2' }] })
            .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

        const res = await request(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${authToken('admin')}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        const countSql = (pool.query as jest.Mock).mock.calls[0][0] as string;
        expect(countSql).not.toContain('t.owner_id');
    });
});

// ── POST / ───────────────────────────────────────────────────────────────────

describe('POST /api/tickets — IDOR sur lot_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it("gestionnaire lié à l'owner du lot : ticket créé", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // SELECT owner_id FROM lots
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // lien owner_user actif
            .mockResolvedValueOnce({ rows: [{ id: 99, statut: 'Ouvert' }] }); // INSERT

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('gestionnaire', 7)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(201);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('FROM owner_user'),
            [1, 7],
        );
    });

    it("gestionnaire d'une autre agence (pas de lien owner_user sur ce lot) : 404, pas d'INSERT", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // le lot appartient à l'owner 1
            .mockResolvedValueOnce({ rows: [] });                // aucun lien owner_user pour cet appelant

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('gestionnaire', 42)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(2); // jamais d'INSERT
    });

    it('locataire avec bail actif sur ce lot : ticket créé', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })   // SELECT owner_id FROM lots
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // bail actif trouvé
            .mockResolvedValueOnce({ rows: [{ id: 100 }] });      // INSERT

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('locataire', 55)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(201);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('FROM leases le JOIN tenants t'),
            [14, 55],
        );
    });

    it("locataire sans bail actif sur ce lot : 404, pas d'INSERT", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })
            .mockResolvedValueOnce({ rows: [] }); // pas de bail actif pour ce locataire sur ce lot

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('locataire', 56)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('admin : ticket créé sans vérification owner_user ni bail', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })
            .mockResolvedValueOnce({ rows: [{ id: 99 }] }); // directement l'INSERT

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('admin', 1)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(201);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });

    // Ajustement lot 1 : propriétaires liés via owner_user (role='owner' en base,
    // même mécanisme de vérification que gestionnaire/manager).
    it("propriétaire lié à cet owner (via owner_user) : ticket créé", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })   // SELECT owner_id FROM lots
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // lien owner_user actif
            .mockResolvedValueOnce({ rows: [{ id: 101 }] });      // INSERT

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('proprietaire', 20)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(201);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('FROM owner_user'),
            [1, 20],
        );
    });

    it("propriétaire non lié à cet owner : 404, pas d'INSERT", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })
            .mockResolvedValueOnce({ rows: [] }); // pas de lien owner_user pour ce propriétaire

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('proprietaire', 21)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });

    // Ajustement lot 1 : valeurs réelles de leases.statut en prod = 'actif' ou 'signe'.
    it("locataire avec bail au statut 'signe' (pas encore 'actif') : ticket créé", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // bail 'signe' trouvé par le IN (...)
            .mockResolvedValueOnce({ rows: [{ id: 102 }] });

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('locataire', 57)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(201);
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("le.statut IN ('actif', 'signe')"),
            [14, 57],
        );
    });

    // Ajustement lot 1 : rôle 'pending' (compte enregistré mais non activé, valeur
    // réelle constatée en prod) — ne correspond à aucune branche autorisée, donc
    // refusé sans jamais interroger owner_user ni leases.
    it("rôle 'pending' : 404, aucune requête d'autorisation déclenchée", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });

        const res = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${authToken('pending', 58)}`)
            .send({ lot_id: 14, description: 'Fuite eau' });

        expect(res.status).toBe(404);
        expect(pool.query).toHaveBeenCalledTimes(1); // seulement le lookup du lot
    });
});
