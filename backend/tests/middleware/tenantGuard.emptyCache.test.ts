/**
 * Tests — cache des propriétaires autorisés (tenantGuard).
 *
 * Bug corrigé : une liste VIDE était mise en cache 5 min. Un gestionnaire qui créait
 * son premier propriétaire restait vu « sans propriétaire » : ses immeubles, lots et
 * locataires étaient enregistrés avec owner_id NULL et ses baux refusés.
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import { tenantGuard } from '../../middleware/tenantGuard';
import { cache, invalidateOwnerIdsCache } from '../../utils/cache';

const makeClient = () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() });
const makeRes = () => {
    const res: any = { on: jest.fn() };
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const run = async (userId: number) => {
    const req: any = { userId, userRole: 'gestionnaire', headers: {}, body: {}, query: {} };
    (pool.connect as jest.Mock).mockResolvedValueOnce(makeClient());
    const next = jest.fn();
    await tenantGuard(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    return req.validOwnerIds as number[];
};
const ownerLookups = () => (pool.query as jest.Mock).mock.calls.filter(([sql]) => String(sql).includes('FROM owner_user'));

beforeEach(() => {
    jest.clearAllMocks();
    cache.del('tenant:owners:77');
});

it('liste vide NON mise en cache : le premier propriétaire est vu à la requête suivante', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });                 // avant création
    expect(await run(77)).toEqual([]);

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 5 }] });  // après création
    expect(await run(77)).toEqual([5]);
    expect(ownerLookups()).toHaveLength(2);
});

it('liste non vide mise en cache (comportement de performance inchangé)', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 5 }] });
    expect(await run(77)).toEqual([5]);
    expect(await run(77)).toEqual([5]);
    expect(ownerLookups()).toHaveLength(1);
});

it('invalidateOwnerIdsCache : un propriétaire ajouté est vu immédiatement', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 5 }] });
    expect(await run(77)).toEqual([5]);

    invalidateOwnerIdsCache(77);
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ owner_id: 5 }, { owner_id: 6 }] });
    expect(await run(77)).toEqual([5, 6]);
});
