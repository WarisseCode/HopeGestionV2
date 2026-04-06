/**
 * Tests d'intégration — GET /api/tasks
 * Vérifie la pagination et le contrôle d'accès sans base de données réelle.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn(),
    },
}));

import pool from '../../db/database';
import taskRouter from '../../routes/taskRoutes';
import { protect } from '../../middleware/authMiddleware';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/tasks', protect, taskRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

const authToken = (userId = 1) =>
    jwt.sign({ id: userId, role: 'gestionnaire', userType: 'gestionnaire' }, JWT_SECRET, { expiresIn: '1h' });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock DB : authMiddleware récupère l'email
        (pool.query as jest.Mock).mockImplementation((sql: string) => {
            if (sql.includes('SELECT email FROM users')) {
                return Promise.resolve({ rows: [{ email: 'test@test.com' }] });
            }
            // COUNT
            if (sql.includes('COUNT(*)')) {
                return Promise.resolve({ rows: [{ count: '2' }] });
            }
            // Data
            return Promise.resolve({
                rows: [
                    { id: 1, title: 'Tâche 1', status: 'todo', priority: 'medium' },
                    { id: 2, title: 'Tâche 2', status: 'in_progress', priority: 'high' },
                ],
            });
        });
    });

    it('renvoie 401 sans token', async () => {
        const res = await request(app).get('/api/tasks');
        expect(res.status).toBe(401);
    });

    it('renvoie un objet paginé avec token valide', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('totalPages');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('applique la pagination via ?page et ?limit', async () => {
        const res = await request(app)
            .get('/api/tasks?page=2&limit=5')
            .set('Authorization', `Bearer ${authToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.page).toBe(2);
        expect(res.body.limit).toBe(5);
    });
});
