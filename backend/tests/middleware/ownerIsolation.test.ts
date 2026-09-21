/**
 * Tests d'intégration — Correctif préventif (audit RLS T-011, ajustement lot 1)
 * checkOwnerAccess : le rôle 'manager' ne doit plus être un bypass global — il doit
 * être vérifié comme un 'gestionnaire' (lien actif dans owner_user). Seul 'admin'
 * garde l'accès global. Aucun compte 'manager' n'existe en prod à ce jour.
 */

import request from 'supertest';
import express from 'express';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import db from '../../db/database';
import { checkOwnerAccess } from '../../middleware/ownerIsolation';

// App de test minimale : une route protégée uniquement par checkOwnerAccess,
// avec userId/userRole injectés directement (authMiddleware n'est pas en cause ici).
function appWithUser(userId: number, userRole: string) {
    const app = express();
    app.use((req: any, _res, next) => {
        req.userId = userId;
        req.userRole = userRole;
        next();
    });
    app.get('/owners/:id', checkOwnerAccess, (_req, res) => res.json({ ok: true }));
    return app;
}

describe('checkOwnerAccess — manager traité comme gestionnaire', () => {
    beforeEach(() => jest.clearAllMocks());

    it("manager non lié à cet owner : 403, sans accès", async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // pas de lien owner_user

        const res = await request(appWithUser(7, 'manager')).get('/owners/1');

        expect(res.status).toBe(403);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('FROM owner_user'),
            ['1', 7],
        );
    });

    it('manager lié activement à cet owner : accès accordé', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

        const res = await request(appWithUser(7, 'manager')).get('/owners/1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('admin : accès accordé sans aucune requête owner_user', async () => {
        const res = await request(appWithUser(1, 'admin')).get('/owners/1');

        expect(res.status).toBe(200);
        expect(db.query).not.toHaveBeenCalled();
    });
});
