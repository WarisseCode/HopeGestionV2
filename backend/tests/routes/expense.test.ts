/**
 * Tests d'intégration — Routes dépenses (/api/expenses)
 * Couvre (suite T-045 mobile / correctifs T-010) :
 *  - invalidation du cache tableau de bord après création et suppression ;
 *  - refus d'un justificatif (taille ou format) en 400 plutôt qu'en 500 générique
 *    (voir handleUploadErrors, uploadMiddleware.ts).
 * DB, permissions et tenantGuard sont mockés (même convention que finance.test.ts).
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

// tenantGuard : dbClient pointe vers le même pool mocké (via require pour éviter le hoist)
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

jest.mock('../../utils/cache', () => ({
    cache: { invalidatePrefix: jest.fn() },
}));

import pool from '../../db/database';
import { cache } from '../../utils/cache';
import expenseRouter from '../../routes/expenseRoutes';

// ── App de test ───────────────────────────────────────────────────────────────
// expenseRoutes.ts applique déjà protect + tenantGuard via router.use() en tête
// de fichier — pas besoin de les remonter ici (même montage qu'index.ts).

const app = express();
app.use(express.json());
app.use('/api/expenses', expenseRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (role = 'gestionnaire') =>
    jwt.sign({ id: 1, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });

// ── Tests : invalidation du cache tableau de bord ────────────────────────────

describe('Invalidation du cache tableau de bord (dépenses)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('POST /api/expenses : invalide le cache après création', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] })     // protect
            .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })                 // buildings.owner_id
            .mockResolvedValueOnce({ rows: [] })                                // BEGIN
            .mockResolvedValueOnce({ rows: [] })                                // set_config
            .mockResolvedValueOnce({
                rows: [{
                    id: 1, building_id: 5, owner_id: 7, category: 'Entretien',
                    amount: '15000', date_expense: '2026-09-01', status: 'paid', proof_url: null,
                }],
            })                                                                  // INSERT ... RETURNING
            .mockResolvedValueOnce({ rows: [] });                               // COMMIT

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken()}`)
            .field('amount', '15000')
            .field('date_expense', '2026-09-01')
            .field('category', 'Entretien')
            .field('building_id', '5');

        expect(res.status).toBe(201);
        expect(cache.invalidatePrefix).toHaveBeenCalledWith('dashboard:');
    });

    it("POST /api/expenses : n'invalide pas le cache si la validation échoue (400)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }); // protect uniquement

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken()}`)
            .field('date_expense', '2026-09-01')
            .field('category', 'Entretien'); // amount manquant

        expect(res.status).toBe(400);
        expect(cache.invalidatePrefix).not.toHaveBeenCalled();
    });

    it('DELETE /api/expenses/:id : invalide le cache après suppression', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] })
            .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // DELETE ... RETURNING id

        const res = await request(app)
            .delete('/api/expenses/1')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(cache.invalidatePrefix).toHaveBeenCalledWith('dashboard:');
    });

    it("DELETE /api/expenses/:id : n'invalide pas le cache si la dépense est introuvable (404)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // DELETE ... RETURNING id : aucune ligne

        const res = await request(app)
            .delete('/api/expenses/999')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(404);
        expect(cache.invalidatePrefix).not.toHaveBeenCalled();
    });
});

// ── Tests : justificatif refusé (upload) — 400 au lieu de 500 ────────────────

describe('Justificatif refusé : 400 au lieu de 500 (handleUploadErrors)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('fichier trop volumineux (> 10 Mo) : 400 avec message clair, aucune écriture en base', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }); // protect

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken()}`)
            .field('amount', '15000')
            .field('date_expense', '2026-09-01')
            .field('category', 'Entretien')
            .attach('proof', Buffer.alloc(11 * 1024 * 1024, 1), {
                filename: 'gros-fichier.jpg',
                contentType: 'image/jpeg',
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            'Justificatif refusé : format non accepté ou fichier trop volumineux (10 Mo maximum).'
        );
        expect(cache.invalidatePrefix).not.toHaveBeenCalled();
        // Seul protect a interrogé la base : multer a rejeté avant tout accès métier.
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('format non accepté (ex. .docx) : 400 avec le même message clair', async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] }); // protect

        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken()}`)
            .field('amount', '15000')
            .field('date_expense', '2026-09-01')
            .field('category', 'Entretien')
            .attach('proof', Buffer.from('contenu de test'), {
                filename: 'facture.docx',
                contentType: 'application/msword',
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            'Justificatif refusé : format non accepté ou fichier trop volumineux (10 Mo maximum).'
        );
        expect(cache.invalidatePrefix).not.toHaveBeenCalled();
        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});
