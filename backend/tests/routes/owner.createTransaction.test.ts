/**
 * Tests — création de propriétaire atomique (lié à la faille C4).
 *
 * POST /api/compte/proprietaires et POST /api/owners créaient le propriétaire puis le
 * lien owner_user hors transaction : un échec du lien laissait un propriétaire orphelin
 * (et, côté /compte, l'erreur était avalée → 201 trompeur). Désormais BEGIN / owner /
 * lien / COMMIT, ROLLBACK + 500 si une étape échoue.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../services/AuditService', () => ({
    AuditService: { log: jest.fn() },
}));
jest.mock('../../middleware/subscriptionLimits', () => ({
    checkAgencyLimit: (_req: any, _res: any, next: any) => next(),
}));

import db from '../../db/database';
import { protect } from '../../middleware/authMiddleware';
import compteRouter from '../../routes/compteRoutes';
import ownerRouter from '../../routes/ownerRoutes';

const app = express();
app.use(express.json());
app.use('/api/compte', protect, compteRouter);
app.use('/api/owners', protect, ownerRouter);

const token = (role: string, id = 7) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, process.env.JWT_SECRET!, { expiresIn: '1h' });

/** Client transactionnel mocké ; `failLink` fait échouer l'INSERT owner_user. */
const setupTx = (failLink: boolean) => {
    const client = {
        query: jest.fn(async (sql: string) => {
            if (sql.includes('INSERT INTO owners')) return { rows: [{ id: 77, name: 'Dupont' }] };
            if (sql.includes('INSERT INTO owner_user')) {
                if (failLink) throw new Error('owner_user insert failed');
                return { rows: [] };
            }
            return { rows: [] };
        }),
        release: jest.fn(),
    };
    (db.connect as jest.Mock).mockReset().mockResolvedValue(client);
    (db.query as jest.Mock).mockReset().mockResolvedValue({ rows: [] });
    return client;
};

const sqlSequence = (client: { query: jest.Mock }) =>
    client.query.mock.calls.map(([sql]) => {
        const s = String(sql).trim();
        if (s.startsWith('INSERT INTO owners')) return 'INSERT owners';
        if (s.startsWith('INSERT INTO owner_user')) return 'INSERT owner_user';
        return s;
    });

const outsideTxInserts = () =>
    (db.query as jest.Mock).mock.calls.filter(([sql]) => /INSERT INTO (owners|owner_user)/.test(String(sql)));

describe('POST /api/compte/proprietaires — transaction owner + lien', () => {
    beforeEach(() => jest.clearAllMocks());

    it('succès : BEGIN, owner, lien, COMMIT puis 201', async () => {
        const client = setupTx(false);

        const res = await request(app)
            .post('/api/compte/proprietaires')
            .set('Authorization', `Bearer ${token('gestionnaire')}`)
            .send({ name: 'Dupont', phone: '+229 01 02 03 04' });

        expect(res.status).toBe(201);
        expect(sqlSequence(client)).toEqual(['BEGIN', 'INSERT owners', 'INSERT owner_user', 'COMMIT']);
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(outsideTxInserts()).toHaveLength(0);
    });

    it('échec du lien owner_user : ROLLBACK (owner non créé) et 500, pas de 201', async () => {
        const client = setupTx(true);

        const res = await request(app)
            .post('/api/compte/proprietaires')
            .set('Authorization', `Bearer ${token('gestionnaire')}`)
            .send({ name: 'Dupont', phone: '+229 01 02 03 04' });

        expect(res.status).toBe(500);
        expect(sqlSequence(client)).toEqual(['BEGIN', 'INSERT owners', 'INSERT owner_user', 'ROLLBACK']);
        expect(client.query).not.toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(outsideTxInserts()).toHaveLength(0);
    });

    it('échec de l\'INSERT owners : ROLLBACK, aucun lien tenté, client libéré, 500', async () => {
        const client = setupTx(false);
        client.query.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO owners')) throw new Error('owners insert failed');
            return { rows: [] };
        });

        const res = await request(app)
            .post('/api/compte/proprietaires')
            .set('Authorization', `Bearer ${token('gestionnaire')}`)
            .send({ name: 'Dupont', phone: '+229 01 02 03 04' });

        expect(res.status).toBe(500);
        expect(sqlSequence(client)).toEqual(['BEGIN', 'INSERT owners', 'ROLLBACK']);
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});

describe('POST /api/owners — transaction owner + lien', () => {
    beforeEach(() => jest.clearAllMocks());

    it('échec du lien owner_user : ROLLBACK et 500', async () => {
        const client = setupTx(true);

        const res = await request(app)
            .post('/api/owners')
            .set('Authorization', `Bearer ${token('gestionnaire')}`)
            .send({ name: 'Dupont', phone: '+22901020304' });

        expect(res.status).toBe(500);
        expect(sqlSequence(client)).toEqual(['BEGIN', 'INSERT owners', 'INSERT owner_user', 'ROLLBACK']);
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(outsideTxInserts()).toHaveLength(0);
    });

    it('succès : COMMIT puis 201', async () => {
        const client = setupTx(false);

        const res = await request(app)
            .post('/api/owners')
            .set('Authorization', `Bearer ${token('gestionnaire')}`)
            .send({ name: 'Dupont', phone: '+22901020304' });

        expect(res.status).toBe(201);
        expect(res.body.ownerId).toBe(77);
        expect(sqlSequence(client)).toEqual(['BEGIN', 'INSERT owners', 'INSERT owner_user', 'COMMIT']);
    });
});
