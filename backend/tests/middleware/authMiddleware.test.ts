import jwt from 'jsonwebtoken';

// Mock la DB pour éviter toute connexion réelle
jest.mock('../../db/database', () => ({
    __esModule: true,
    default: {
        query: jest.fn().mockResolvedValue({ rows: [{ email: 'test@example.com' }] }),
        connect: jest.fn(),
    },
}));

import { protect } from '../../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET!;

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (token?: string): any => ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
});

describe('protect middleware', () => {
    it('rejette les requêtes sans token (401)', async () => {
        const req  = mockReq();
        const res  = mockRes();
        const next = jest.fn();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejette un token invalide (403)', async () => {
        const req  = mockReq('invalid.token.here');
        const res  = mockRes();
        const next = jest.fn();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('accepte un token valide et appelle next()', async () => {
        const token = jwt.sign(
            { id: 1, role: 'gestionnaire', userType: 'gestionnaire' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const req  = mockReq(token);
        const res  = mockRes();
        const next = jest.fn();

        await protect(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(1);
        expect(req.userRole).toBe('gestionnaire');
    });

    it('rejette un token expiré (403)', async () => {
        const token = jwt.sign(
            { id: 1, role: 'gestionnaire' },
            JWT_SECRET,
            { expiresIn: '-1s' } // Déjà expiré
        );

        const req  = mockReq(token);
        const res  = mockRes();
        const next = jest.fn();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
