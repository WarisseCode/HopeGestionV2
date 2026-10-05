/**
 * Tests — Correctif IDOR sur PUT /api/notifications/:id/read.
 *
 * Avant : `UPDATE notifications SET is_read = TRUE WHERE id = $1`, sans filtre
 * user_id → n'importe quel utilisateur authentifié pouvait marquer comme lue la
 * notification d'un autre. Après : clause `AND user_id = $2` + RETURNING ; si
 * aucune ligne n'appartient à l'appelant → 404 (pas 403, pour ne pas confirmer
 * l'existence d'une notification tierce).
 *
 * DB mockée : on vérifie la requête construite (SQL + params) et le
 * comportement de la route quand le filtre exclut la ligne (0 ligne affectée).
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import notificationRoutes from '../../routes/notificationRoutes';

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const USER_A = 101; // propriétaire de la notification
const USER_B = 202; // autre utilisateur authentifié
const NOTIF_OF_A = 555;

const tokenFor = (id: number) =>
    jwt.sign({ id, role: 'gestionnaire', userType: 'gestionnaire' }, JWT_SECRET, { expiresIn: '1h' });

/** `protect` fait un premier SELECT email avant que la route ne s'exécute. */
const mockAuthLookup = () =>
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });

describe('PUT /api/notifications/:id/read — filtre user_id', () => {
    beforeEach(() => jest.clearAllMocks());

    it("utilisateur B sur la notification de A : 404, UPDATE filtré par l'id de B, 0 ligne affectée", async () => {
        mockAuthLookup();
        // Le filtre `user_id = B` exclut la ligne de A → aucune ligne mise à jour.
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app)
            .put(`/api/notifications/${NOTIF_OF_A}/read`)
            .set('Authorization', `Bearer ${tokenFor(USER_B)}`);

        expect(res.status).toBe(404);
        expect(res.body).not.toHaveProperty('success');

        const updateCalls = (pool.query as jest.Mock).mock.calls.filter(([sql]) =>
            String(sql).includes('UPDATE notifications'));
        expect(updateCalls).toHaveLength(1);
        const [sql, params] = updateCalls[0];
        expect(sql).toContain('WHERE id = $1 AND user_id = $2');
        expect(params).toEqual([NOTIF_OF_A, USER_B]);
        // Aucune requête n'a ciblé l'utilisateur A.
        expect(params).not.toContain(USER_A);
    });

    it('utilisateur A sur sa propre notification : 200 { success: true }', async () => {
        mockAuthLookup();
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: NOTIF_OF_A }], rowCount: 1 });

        const res = await request(app)
            .put(`/api/notifications/${NOTIF_OF_A}/read`)
            .set('Authorization', `Bearer ${tokenFor(USER_A)}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });

        const [sql, params] = (pool.query as jest.Mock).mock.calls[1];
        expect(sql).toContain('AND user_id = $2');
        expect(params).toEqual([NOTIF_OF_A, USER_A]);
    });

    it('sans jeton : 401, aucune requête UPDATE', async () => {
        const res = await request(app).put(`/api/notifications/${NOTIF_OF_A}/read`);

        expect(res.status).toBe(401);
        expect(pool.query).not.toHaveBeenCalled();
    });
});
