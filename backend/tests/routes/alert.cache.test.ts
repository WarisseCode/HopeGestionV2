/**
 * GET /api/alertes — cache d'une minute du calcul des alertes.
 *
 * Le calcul (retards, échéances, tickets, lots vacants) est mis en cache par périmètre
 * (propriétaires + rôle). Les alertes ignorées sont retirées APRÈS, à chaque appel et
 * pour chaque utilisateur : elles ne doivent jamais « fuiter » d'un compte à l'autre via
 * le cache, et « Ignorer » doit rester immédiat. Le préfixe « dashboard: » fait que les
 * écritures qui vident le cache du tableau de bord (paiement, bail…) vident aussi celui-ci.
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
import { cache } from '../../utils/cache';

const app = express();
app.use(express.json());
app.use('/api/alertes', alertRouter);

const token = (id: number, role = 'gestionnaire') =>
    jwt.sign({ id, role, email: `${role}${id}@test.dev` }, process.env.JWT_SECRET!, { expiresIn: '1h' });

/** Requêtes du calcul des alertes (celles que le cache doit éviter). */
const isComputeQuery = (sql: string) =>
    sql.includes('FROM leases l') || sql.includes('FROM lots lo') || sql.includes('FROM tickets t');

/**
 * Base simulée : `links` = propriétaires de chaque utilisateur, `dismissed` = alertes
 * ignorées par utilisateur. Un lot vacant existe toujours (alerte « vac_all »).
 */
const setup = (links: Record<number, number[]>, dismissed: Record<number, string[]> = {}) => {
    let currentUser = 0;
    const client = {
        query: jest.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
            if (sql.includes('set_config')) { currentUser = Number(params?.[1]); return { rows: [] }; }
            if (sql.includes('FROM dismissed_alerts')) {
                return { rows: (dismissed[currentUser] || []).map(alert_id => ({ alert_id })) };
            }
            if (sql.includes('FROM lots lo')) return { rows: [{ id: 1, ref_lot: 'A1', building_name: 'Immeuble' }] };
            return { rows: [] };
        }),
        release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockReset().mockResolvedValue(client);
    (pool.query as jest.Mock).mockReset().mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('FROM owner_user')) return { rows: (links[Number(params?.[0])] || []).map(owner_id => ({ owner_id })) };
        return { rows: [] };
    });
    return client;
};

const computeCalls = (client: { query: jest.Mock }) =>
    client.query.mock.calls.filter(([sql]) => isComputeQuery(String(sql))).length;

const get = (userId: number) => request(app).get('/api/alertes').set('Authorization', `Bearer ${token(userId)}`);

describe('GET /api/alertes — cache du calcul', () => {
    beforeEach(() => {
        // Cache réel (utils/cache) : purge entre les scénarios.
        cache.invalidatePrefix('dashboard:');
        cache.invalidatePrefix('tenant:owners:');
    });

    it('deuxième appel dans la minute : le calcul n’est pas refait, réponse identique', async () => {
        const client = setup({ 7: [5] });

        const first = await get(7);
        const afterFirst = computeCalls(client);
        const second = await get(7);

        expect(afterFirst).toBeGreaterThan(0);
        expect(computeCalls(client)).toBe(afterFirst); // aucune requête de calcul en plus
        expect(second.body.alerts).toEqual(first.body.alerts);
        expect(second.body.alerts.map((a: any) => a.id)).toEqual(['vac_all']);
    });

    it('alertes ignorées : retirées pour l’utilisateur concerné seulement, même sur cache', async () => {
        // Les comptes 7 et 8 gèrent le même propriétaire (même clé de cache).
        setup({ 7: [5], 8: [5] }, { 7: ['vac_all'] });

        const user8 = await get(8);  // calcule et met en cache
        const user7 = await get(7);  // lit le cache, mais a ignoré « vac_all »
        const user8Again = await get(8);

        expect(user8.body.alerts.map((a: any) => a.id)).toEqual(['vac_all']);
        expect(user7.body.alerts).toEqual([]);
        expect(user7.body.dismissedCount).toBe(1);
        expect(user8Again.body.alerts.map((a: any) => a.id)).toEqual(['vac_all']); // pas contaminé
    });

    it('« Ignorer » est immédiat : pas besoin d’attendre l’expiration du cache', async () => {
        const dismissed: Record<number, string[]> = {};
        setup({ 7: [5] }, dismissed);

        expect((await get(7)).body.alerts).toHaveLength(1);
        dismissed[7] = ['vac_all']; // l'utilisateur vient de cliquer « Ignorer »
        expect((await get(7)).body.alerts).toEqual([]);
    });

    it('propriétaires différents : calcul distinct, filtré sur les bons propriétaires', async () => {
        const client = setup({ 7: [5], 9: [6] });

        await get(7);
        const before = computeCalls(client);
        await get(9);

        expect(computeCalls(client)).toBeGreaterThan(before);
        expect(client.query).toHaveBeenCalledWith(expect.stringContaining('ANY($1::int[])'), [[6]]);
    });

    it('vider le cache du tableau de bord (paiement, bail…) force le recalcul', async () => {
        const client = setup({ 7: [5] });

        await get(7);
        const before = computeCalls(client);
        cache.invalidatePrefix('dashboard:'); // ce que font les routes d'écriture
        await get(7);

        expect(computeCalls(client)).toBeGreaterThan(before);
    });
});
