/**
 * Tests unitaires — tenantGuard (faille C4 de l'audit sécurité).
 *
 * Avant correctif : pour un compte SANS lien actif owner_user, l'owner_id fourni par le
 * client (body/query) devenait resolvedOwnerId et pilotait app.current_owner_id sans
 * aucune vérification. Désormais il n'est retenu que pour un rôle privilégié (admin) ET
 * si le propriétaire existe et est actif ; sinon il est ignoré.
 */

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

import pool from '../../db/database';
import { tenantGuard } from '../../middleware/tenantGuard';

type MockClient = { query: jest.Mock; release: jest.Mock };

const makeClient = (): MockClient => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
});

const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.on = jest.fn();
    res.headersSent = false;
    return res;
};

/** Valeur posée dans app.current_owner_id ('' = vidé), lue sur le client mocké. */
const currentOwnerConfig = (client: MockClient): string | undefined => {
    const call = client.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes("'app.current_owner_id'"),
    );
    if (!call) return undefined;
    return call[1] ? call[1][0] : '';
};

const run = async (opts: {
    links: number[];
    role: string;
    body?: any;
    query?: any;
    ownerExists?: boolean;
}) => {
    const client = makeClient();
    (pool.query as jest.Mock).mockReset();
    (pool.connect as jest.Mock).mockReset().mockResolvedValue(client);

    (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
        if (sql.includes('FROM owner_user')) {
            return { rows: opts.links.map(owner_id => ({ owner_id })) };
        }
        if (sql.includes('FROM owners')) {
            return { rows: opts.ownerExists ? [{ '?column?': 1 }] : [] };
        }
        throw new Error(`Requête inattendue : ${sql}`);
    });

    const req: any = {
        userId: 7,
        userRole: opts.role,
        headers: {},
        body: opts.body ?? {},
        query: opts.query ?? {},
    };
    const res = makeRes();
    const next = jest.fn();

    await tenantGuard(req, res, next);
    return { req, res, next, client };
};

const ownersLookupCalls = () =>
    (pool.query as jest.Mock).mock.calls.filter(([sql]) => sql.includes('FROM owners'));

describe('tenantGuard — comptes avec lien(s) owner_user (inchangé)', () => {
    it('lien unique : owner_id client ignoré, resolvedOwnerId = le lien', async () => {
        const { req, next, client } = await run({ links: [5], role: 'gestionnaire', body: { owner_id: 999 } });

        expect(next).toHaveBeenCalled();
        expect(req.resolvedOwnerId).toBe(5);
        expect(currentOwnerConfig(client)).toBe('5');
        expect(req.validOwnerIds).toEqual([5]);
    });

    it('plusieurs liens : owner_id client accepté s\'il est dans validOwnerIds', async () => {
        const { req, client } = await run({ links: [5, 6], role: 'gestionnaire', query: { owner_id: '6' } });

        expect(req.resolvedOwnerId).toBe(6);
        expect(currentOwnerConfig(client)).toBe('6');
    });

    it('plusieurs liens : owner_id client hors validOwnerIds → null', async () => {
        const { req, client } = await run({ links: [5, 6], role: 'gestionnaire', body: { owner_id: 999 } });

        expect(req.resolvedOwnerId).toBeNull();
        expect(currentOwnerConfig(client)).toBe('');
    });
});

describe('tenantGuard — compte SANS lien owner_user (faille C4)', () => {
    it('admin, owner_id existant et actif : accepté après vérification en base', async () => {
        const { req, next, client } = await run({ links: [], role: 'admin', body: { owner_id: 42 }, ownerExists: true });

        expect(next).toHaveBeenCalled();
        expect(req.resolvedOwnerId).toBe(42);
        expect(currentOwnerConfig(client)).toBe('42');
        const lookups = ownersLookupCalls();
        expect(lookups).toHaveLength(1);
        expect(lookups[0][0]).toMatch(/is_active\s*=\s*TRUE/);
        expect(lookups[0][1]).toEqual([42]);
    });

    it('admin, owner_id inexistant ou inactif : traité comme absent', async () => {
        const { req, next, res, client } = await run({ links: [], role: 'admin', query: { owner_id: '404' }, ownerExists: false });

        expect(next).toHaveBeenCalled();           // pas de réponse distincte (pas d'oracle d'existence)
        expect(res.status).not.toHaveBeenCalled();
        expect(req.resolvedOwnerId).toBeNull();
        expect(currentOwnerConfig(client)).toBe('');
    });

    it.each(['gestionnaire', 'manager', 'proprietaire', 'comptable', 'super_admin', 'locataire', 'ADMIN'])(
        'rôle non privilégié "%s", owner_id fourni : IGNORÉ (aucune fuite)',
        async (role) => {
            const viaBody = await run({ links: [], role, body: { owner_id: 42 }, ownerExists: true });
            expect(viaBody.next).toHaveBeenCalled();
            expect(viaBody.req.resolvedOwnerId).toBeNull();
            expect(currentOwnerConfig(viaBody.client)).toBe('');
            expect(ownersLookupCalls()).toHaveLength(0); // aucun accès à owners → pas d'oracle

            const viaQuery = await run({ links: [], role, query: { owner_id: '42' }, ownerExists: true });
            expect(viaQuery.req.resolvedOwnerId).toBeNull();
            expect(currentOwnerConfig(viaQuery.client)).toBe('');
            expect(ownersLookupCalls()).toHaveLength(0);
        },
    );

    it('aucun owner_id fourni : comportement inchangé (null, contexte vidé)', async () => {
        for (const role of ['admin', 'gestionnaire']) {
            const { req, next, client } = await run({ links: [], role });
            expect(next).toHaveBeenCalled();
            expect(req.resolvedOwnerId).toBeNull();
            expect(currentOwnerConfig(client)).toBe('');
            expect(req.validOwnerIds).toEqual([]);
            expect(ownersLookupCalls()).toHaveLength(0);
        }
    });

    it('admin, erreur DB lors de la vérification owners : 500, next non appelé, client libéré', async () => {
        const client = makeClient();
        (pool.connect as jest.Mock).mockReset().mockResolvedValue(client);
        (pool.query as jest.Mock).mockReset().mockImplementation(async (sql: string) => {
            if (sql.includes('FROM owner_user')) return { rows: [] };
            throw new Error('db down');
        });
        const req: any = { userId: 7, userRole: 'admin', headers: {}, body: { owner_id: 42 }, query: {} };
        const res = makeRes();
        const next = jest.fn();

        await tenantGuard(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(req.resolvedOwnerId).toBeUndefined();
    });

    it('app.current_user_id est toujours posé', async () => {
        const { client } = await run({ links: [], role: 'gestionnaire', body: { owner_id: 42 } });
        expect(client.query).toHaveBeenCalledWith(
            expect.stringContaining("'app.current_user_id'"),
            ['7'],
        );
    });
});
