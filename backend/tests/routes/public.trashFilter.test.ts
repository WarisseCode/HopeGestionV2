/**
 * Tests — GET /api/public/lots : biens à la corbeille exclus de la page publique.
 *
 * Bug signalé par l'utilisateur : des biens restaient visibles publiquement alors
 * qu'ils n'apparaissaient plus dans son dashboard. Les deux requêtes publiques
 * (lots libres + immeubles entiers) n'avaient aucun filtre `deleted_at`, la requête
 * immeubles n'avait même aucun WHERE. Les filtres reprennent exactement ceux de
 * GET /api/biens/lots et GET /api/biens/immeubles (dashboard).
 *
 * La DB est mockée par un faux client qui applique aux fixtures les filtres
 * réellement présents dans le SQL construit par la route : sans les clauses
 * `deleted_at`, les lignes à la corbeille ressortent (contre-épreuve).
 */

import request from 'supertest';
import express from 'express';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../middleware/maintenanceMiddleware', () => ({
    getMaintenanceStatus: (_req: any, res: any) => res.json({}),
    emergencyDisableMaintenance: (_req: any, res: any) => res.json({}),
}));

import pool from '../../db/database';
import publicRouter from '../../routes/publicRoutes';

const app = express();
app.use(express.json());
app.use('/api/public', publicRouter);

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DELETED = '2026-10-01T00:00:00Z';

const buildings = [
    { id: 1, nom: 'Résidence Active', statut: 'actif', deleted_at: null },
    { id: 2, nom: 'Immeuble Corbeille', statut: 'actif', deleted_at: DELETED },
];

const lots = [
    { id: 10, building_id: 1, statut: 'libre', surface: 50, loyer_mensuel: 100000, deleted_at: null },
    { id: 11, building_id: 1, statut: 'libre', surface: 30, loyer_mensuel: 50000, deleted_at: DELETED },
    { id: 12, building_id: 2, statut: 'disponible', surface: 40, loyer_mensuel: 80000, deleted_at: null },
    { id: 13, building_id: 1, statut: 'occupe', surface: 70, loyer_mensuel: 150000, deleted_at: null },
];

const isFreeStatus = (s: string) => ['libre', 'vacant', 'disponible'].includes(s.toLowerCase());

// SQL sans commentaires, espaces normalisés (les commentaires de la route ne
// doivent pas fausser l'analyse des clauses).
const normalize = (sql: string) => sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ');

// Faux client : interprète uniquement les clauses dont dépend ce correctif.
const fakeQuery = jest.fn(async (sql: string) => {
    if (sql.includes('set_config')) return { rows: [] };

    const compact = normalize(sql);

    if (/FROM lots l JOIN buildings b/.test(compact)) {
        const filterLot = compact.includes('l.deleted_at IS NULL');
        const filterBuilding = compact.includes('b.deleted_at IS NULL');
        const rows = lots
            .filter((l) => isFreeStatus(l.statut))
            .filter((l) => !filterLot || l.deleted_at === null)
            .map((l) => ({ l, b: buildings.find((b) => b.id === l.building_id)! }))
            .filter(({ b }) => !filterBuilding || b.deleted_at === null)
            .map(({ l, b }) => ({ ...l, ref_lot: `L${l.id}`, immeuble_nom: b.nom }));
        return { rows };
    }

    if (/FROM buildings b LEFT JOIN lots l/.test(compact)) {
        const joinClause = compact.slice(compact.indexOf('LEFT JOIN lots l'), compact.indexOf('GROUP BY'));
        const whereClause = compact.includes('WHERE')
            ? compact.slice(compact.indexOf('WHERE'), compact.indexOf('GROUP BY'))
            : '';
        // La jointure ne s'arrête qu'au WHERE éventuel.
        const joinOnly = whereClause ? joinClause.slice(0, joinClause.indexOf('WHERE')) : joinClause;
        const joinFiltersLotTrash = joinOnly.includes('l.deleted_at IS NULL');
        const whereFiltersBuildingTrash = whereClause.includes('b.deleted_at IS NULL');

        const rows = buildings
            .filter((b) => !whereFiltersBuildingTrash || b.deleted_at === null)
            .map((b) => {
                const joined = lots.filter((l) =>
                    l.building_id === b.id && isFreeStatus(l.statut)
                    && (!joinFiltersLotTrash || l.deleted_at === null));
                return {
                    ...b,
                    titre: b.nom,
                    surface: joined.reduce((s, l) => s + l.surface, 0),
                    loyer_mensuel: joined.length ? Math.min(...joined.map((l) => l.loyer_mensuel)) : 0,
                };
            });
        return { rows };
    }

    throw new Error(`Requête inattendue : ${compact.slice(0, 80)}`);
});

const sqlOf = (pattern: RegExp) =>
    fakeQuery.mock.calls.map((c) => normalize(String(c[0]))).find((s) => pattern.test(s))!;

beforeEach(() => {
    fakeQuery.mockClear();
    (pool.connect as jest.Mock).mockResolvedValue({ query: fakeQuery, release: jest.fn() });
});

// ── Lots ─────────────────────────────────────────────────────────────────────

describe('GET /api/public/lots — lots à la corbeille', () => {
    it('SQL : filtre corbeille sur le lot ET sur son immeuble, filtre de statut conservé', async () => {
        await request(app).get('/api/public/lots');
        const sql = sqlOf(/FROM lots l JOIN buildings b/).replace(/\s+/g, ' ');
        expect(sql).toContain("LOWER(l.statut) IN ('libre', 'vacant', 'disponible')");
        expect(sql).toContain('l.deleted_at IS NULL');
        expect(sql).toContain('b.deleted_at IS NULL');
    });

    it('lot actif d\'un immeuble actif → présent (non-régression)', async () => {
        const res = await request(app).get('/api/public/lots');
        expect(res.status).toBe(200);
        const lotIds = res.body.filter((i: any) => !i.isBuilding).map((i: any) => i.id);
        expect(lotIds).toContain(10);
    });

    it('lot à la corbeille → absent', async () => {
        const res = await request(app).get('/api/public/lots');
        const lotIds = res.body.filter((i: any) => !i.isBuilding).map((i: any) => i.id);
        expect(lotIds).not.toContain(11);
    });

    it('lot actif dont l\'immeuble est à la corbeille → absent', async () => {
        const res = await request(app).get('/api/public/lots');
        const lotIds = res.body.filter((i: any) => !i.isBuilding).map((i: any) => i.id);
        expect(lotIds).not.toContain(12);
    });

    it('lot occupé → toujours absent (filtre de statut inchangé)', async () => {
        const res = await request(app).get('/api/public/lots');
        const lotIds = res.body.filter((i: any) => !i.isBuilding).map((i: any) => i.id);
        expect(lotIds).not.toContain(13);
    });
});

// ── Immeubles ────────────────────────────────────────────────────────────────

describe('GET /api/public/lots — immeubles à la corbeille', () => {
    it('SQL : WHERE b.deleted_at IS NULL, sans filtre de statut sur l\'immeuble (symétrie dashboard)', async () => {
        await request(app).get('/api/public/lots');
        const sql = sqlOf(/FROM buildings b LEFT JOIN lots l/).replace(/\s+/g, ' ');
        const where = sql.slice(sql.indexOf('WHERE'), sql.indexOf('GROUP BY'));
        expect(where).toContain('b.deleted_at IS NULL');
        expect(where).not.toContain('b.statut');
        // Lots à la corbeille exclus dans la jointure (agrégats), pas dans le WHERE :
        // un immeuble sans lot libre actif reste listé.
        const join = sql.slice(sql.indexOf('LEFT JOIN lots l'), sql.indexOf('WHERE'));
        expect(join).toContain('l.deleted_at IS NULL');
        expect(where).not.toContain('l.deleted_at');
    });

    it('immeuble actif → présent (non-régression)', async () => {
        const res = await request(app).get('/api/public/lots');
        const ids = res.body.filter((i: any) => i.isBuilding).map((i: any) => i.id);
        expect(ids).toContain('b-1');
    });

    it('immeuble à la corbeille → absent', async () => {
        const res = await request(app).get('/api/public/lots');
        const ids = res.body.filter((i: any) => i.isBuilding).map((i: any) => i.id);
        expect(ids).not.toContain('b-2');
    });

    it('agrégats de l\'immeuble actif ignorent ses lots à la corbeille', async () => {
        const res = await request(app).get('/api/public/lots');
        const b1 = res.body.find((i: any) => i.id === 'b-1');
        expect(b1.surface).toBe(50);    // lot 11 (corbeille, 30 m²) non compté
        expect(b1.loyer).toBe(100000);  // pas 50000 (loyer du lot 11)
    });
});
