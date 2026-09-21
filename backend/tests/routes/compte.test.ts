/**
 * Tests d'intégration — Correctif faille #3 (audit RLS T-011)
 * GET /api/compte/proprietaires/:id/biens : IDOR — le rôle seul autorisait l'appel,
 * rien ne vérifiait que l'appelant est bien lié à CET owner précis (owner_user).
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// compteRoutes.ts importe AuditService, qui importe `pool` depuis `../index` (le point
// d'entrée du serveur, avec app.listen/helmet/etc.) — on le mocke pour ne charger que
// le routeur, sans démarrer l'application complète.
jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn() },
}));

import db from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import compteRouter from '../../routes/compteRoutes';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/compte', protect, compteRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire', id = 1) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

// ── GET /proprietaires/:id/biens ────────────────────────────────────────────

describe('GET /api/compte/proprietaires/:id/biens — IDOR', () => {
    beforeEach(() => jest.clearAllMocks());

    it('gestionnaire lié à cet owner (lien actif) : accède à ses biens', async () => {
        (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })            // lien owner_user actif
            .mockResolvedValueOnce({ rows: [{ id: 10, name: 'Immeuble A' }] }) // buildings
            .mockResolvedValueOnce({ rows: [] });                             // lots

        const res = await request(app)
            .get('/api/compte/proprietaires/1/biens')
            .set('Authorization', `Bearer ${authToken('gestionnaire', 7)}`);

        expect(res.status).toBe(200);
        expect(res.body.buildings).toEqual([{ id: 10, name: 'Immeuble A' }]);
        expect(db.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('FROM owner_user'),
            ['1', 7],
        );
    });

    it("gestionnaire d'une autre agence (pas de lien) : 404, aucune donnée renvoyée", async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // pas de lien owner_user actif

        const res = await request(app)
            .get('/api/compte/proprietaires/999/biens')
            .set('Authorization', `Bearer ${authToken('gestionnaire', 42)}`);

        expect(res.status).toBe(404);
        expect(db.query).toHaveBeenCalledTimes(1); // jamais de lecture buildings/lots
    });

    it('admin : accès direct, pas de vérification owner_user', async () => {
        (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: 10, name: 'Immeuble A' }] }) // buildings
            .mockResolvedValueOnce({ rows: [] });                              // lots

        const res = await request(app)
            .get('/api/compte/proprietaires/1/biens')
            .set('Authorization', `Bearer ${authToken('admin', 1)}`);

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledTimes(2);
    });

    it("rôle non autorisé (locataire) : 403 avant toute requête", async () => {
        const res = await request(app)
            .get('/api/compte/proprietaires/1/biens')
            .set('Authorization', `Bearer ${authToken('locataire', 8)}`);

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });
});
