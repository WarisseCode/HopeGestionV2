/**
 * Tests unitaires — permissionMiddleware (checkPermission / permissions.*)
 * Vérifie que le contrôle d'accès par matrice de permissions fonctionne correctement.
 * Pool mocké depuis index (point d'entrée réel du middleware).
 */

// Mock pool avant tout import (permissionMiddleware importe pool depuis db/database)
jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import { checkPermission, permissions } from '../../middleware/permissionMiddleware';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { Response } from 'express';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockRes = (): Partial<Response> => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (role: string): Partial<AuthenticatedRequest> => ({
    userRole: role,
    userId: 1,
} as any);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkPermission middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it("accorde l'accès à l'admin sans consulter la DB", async () => {
        const req  = mockReq('admin');
        const res  = mockRes();
        const next = jest.fn();

        await checkPermission('finance', 'read')(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('accorde accès si la matrice contient can_read=true', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ can_read: true }],
        });

        const req  = mockReq('gestionnaire');
        const res  = mockRes();
        const next = jest.fn();

        await checkPermission('finance', 'read')(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('renvoie 403 si can_read=false', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ can_read: false }],
        });

        const req  = mockReq('locataire');
        const res  = mockRes();
        const next = jest.fn();

        await checkPermission('finance', 'read')(req as any, res as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('renvoie 403 si aucune entrée dans la matrice pour ce rôle + module', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const req  = mockReq('gestionnaire');
        const res  = mockRes();
        const next = jest.fn();

        await checkPermission('module-inconnu', 'write')(req as any, res as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('renvoie 500 si la DB lève une erreur', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

        const req  = mockReq('gestionnaire');
        const res  = mockRes();
        const next = jest.fn();

        await checkPermission('finance', 'read')(req as any, res as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it("permissions.canWrite crée un middleware d'écriture valide", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ can_write: true }],
        });

        const req  = mockReq('gestionnaire');
        const res  = mockRes();
        const next = jest.fn();

        await permissions.canWrite('biens')(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        // Vérifie que la colonne interrogée est bien can_write
        const sqlCalled: string = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sqlCalled).toContain('can_write');
    });

    it("permissions.canDelete est refusé si can_delete=false", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ can_delete: false }],
        });

        const req  = mockReq('gestionnaire');
        const res  = mockRes();
        const next = jest.fn();

        await permissions.canDelete('biens')(req as any, res as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
