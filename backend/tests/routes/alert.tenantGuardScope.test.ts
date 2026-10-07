/**
 * Test d'intégration — faille C4 (tenantGuard) de bout en bout sur GET /api/alertes.
 *
 * Avant correctif : un compte sans lien owner_user passant ?owner_id=999 obtenait
 * resolvedOwnerId = 999, et la route interrogeait les baux / lots / tickets de cet
 * owner arbitraire. Désormais l'owner_id client est ignoré : la route renvoie une
 * liste vide sans jamais interroger les données d'un autre propriétaire.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import alertRouter from '../../routes/alertRoutes';

const app = express();
app.use(express.json());
app.use('/api/alertes', alertRouter);

const token = (role: string, id: number) =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, process.env.JWT_SECRET!, { expiresIn: '1h' });

const setup = (links: number[]) => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    (pool.connect as jest.Mock).mockReset().mockResolvedValue(client);
    (pool.query as jest.Mock).mockReset().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM owner_user')) return { rows: links.map(owner_id => ({ owner_id })) };
        if (sql.includes('FROM owners')) return { rows: [{ '?column?': 1 }] }; // l'owner 999 existe
        return { rows: [] };
    });
    return client;
};

/** Paramètres de requête SQL contenant l'owner 999 (signe d'une fuite inter-propriétaires). */
const callsTargeting999 = (client: { query: jest.Mock }) =>
    client.query.mock.calls.filter(([, params]) => JSON.stringify(params ?? []).includes('999'));

describe('GET /api/alertes — owner_id client et tenantGuard (C4)', () => {
    it('gestionnaire sans lien, ?owner_id=999 : aucune donnée de l\'owner 999 lue', async () => {
        const client = setup([]);

        const res = await request(app)
            .get('/api/alertes?owner_id=999')
            .set('Authorization', `Bearer ${token('gestionnaire', 7)}`);

        expect(res.status).toBe(200);
        expect(res.body.alerts).toEqual([]);
        expect(callsTargeting999(client)).toHaveLength(0);
        // seules requêtes : set_config (user + owner vidé) + dismissed_alerts
        expect(client.query).toHaveBeenCalledTimes(3);
    });

    it('gestionnaire lié à l\'owner 5, ?owner_id=999 : filtré sur son seul owner', async () => {
        const client = setup([5]);

        const res = await request(app)
            .get('/api/alertes?owner_id=999')
            .set('Authorization', `Bearer ${token('gestionnaire', 7)}`);

        expect(res.status).toBe(200);
        expect(callsTargeting999(client)).toHaveLength(0);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('ANY($1::int[])'), [[5]]);
    });
});
