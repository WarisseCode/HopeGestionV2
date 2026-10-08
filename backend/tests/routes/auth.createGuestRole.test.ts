/**
 * Tests — POST /api/auth/create-guest : liste blanche du rôle invité.
 *
 * Avant ce correctif : `const guestRole = role || 'viewer'` puis écriture telle quelle
 * dans users.role, sans liste blanche (role: 'admin' accepté dès lors qu'une ligne
 * permission_matrix existait). Désormais seuls viewer / comptable / agent_recouvreur
 * sont acceptés ; toute autre valeur → 400 avant toute transaction.
 *
 * DB mockée : on vérifie qu'aucun INSERT n'est émis quand la requête est refusée.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../services/EmailService', () => ({
    __esModule: true,
    default: { sendEmail: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('bcrypt', () => ({
    ...jest.requireActual('bcrypt'),
    hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
}));

import pool from '../../db/database';
import authRouter from '../../routes/authRoutes';
import { JWT_SECRET } from '../../config/config';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const token = jwt.sign({ id: 1, role: 'gestionnaire', userType: 'gestionnaire' }, JWT_SECRET, { expiresIn: '1h' });

const basePayload = { nom: 'Invité', prenom: 'Test', telephone: '+22990000000' };

let mockClient: { query: jest.Mock; release: jest.Mock };

/** Transaction qui réussit : pas de doublon, issuer lié à l'owner 10, matrice non vide. */
const mockSuccessfulGuest = () => {
    mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
            if (/SELECT id FROM users WHERE telephone/i.test(sql)) return Promise.resolve({ rows: [] });
            if (/SELECT agency_id/i.test(sql)) return Promise.resolve({ rows: [{ agency_id: null }] });
            if (/INSERT INTO users/i.test(sql)) return Promise.resolve({ rows: [{ id: 555 }] });
            if (/FROM owner_user/i.test(sql)) return Promise.resolve({ rows: [{ owner_id: 10 }] });
            if (/FROM permission_matrix/i.test(sql)) {
                return Promise.resolve({ rows: [{ module: 'finance', can_read: true, can_write: false, can_delete: false, can_validate: false }] });
            }
            return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
};

const insertedUserRole = () => {
    const call = mockClient.query.mock.calls.find((c) => /INSERT INTO users/i.test(String(c[0])));
    return call ? call[1][4] : undefined;
};

const post = (body: any) =>
    request(app).post('/api/auth/create-guest').set('Authorization', `Bearer ${token}`).send(body);

beforeEach(() => {
    jest.clearAllMocks();
    mockSuccessfulGuest();
});

describe('POST /api/auth/create-guest — liste blanche du rôle', () => {
    it.each(['admin', 'gestionnaire', 'proprietaire', 'manager', 'owner', 'locataire', 'super_admin', 'n_importe_quoi'])(
        'role "%s" → 400, aucune transaction, aucun INSERT',
        async (role) => {
            const res = await post({ ...basePayload, role });

            expect(res.status).toBe(400);
            expect(pool.connect).not.toHaveBeenCalled();
            expect(mockClient.query).not.toHaveBeenCalled();
        }
    );

    it('role non-chaîne (tableau) → 400, aucun INSERT', async () => {
        const res = await post({ ...basePayload, role: ['admin'] });

        expect(res.status).toBe(400);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    it.each(['viewer', 'comptable', 'agent_recouvreur'])('role autorisé "%s" → 201, rôle écrit tel quel', async (role) => {
        const res = await post({ ...basePayload, role });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe(role);
        expect(insertedUserRole()).toBe(role);
    });

    it('sans role (permissions explicites) → viewer par défaut, 201', async () => {
        const res = await post({ ...basePayload, permissions: { can_view_finances: true } });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('viewer');
        expect(insertedUserRole()).toBe('viewer');
    });
});
