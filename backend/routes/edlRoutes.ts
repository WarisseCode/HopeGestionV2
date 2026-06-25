import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import permissions from '../middleware/permissionMiddleware';
import { validate } from '../middleware/validate';
import { streamEdlPdf, streamComparePdf } from '../services/EdlPdfService';

const router = express.Router();

// Valeurs autorisées (alignées sur les contraintes CHECK en base, migration 049) :
// renvoyer un 400 propre plutôt qu'un 500 (violation CHECK) sur une valeur hors liste.
const TYPES_EDL = ['entree', 'sortie', 'intermediaire'];
const STATUTS_EDL = ['brouillon', 'signe', 'cloture', 'archive'];
const ETATS_ITEM = ['neuf', 'bon', 'usager', 'mauvais', 'hs'];

// edl_inspections.id et edl_items.id sont SERIAL (int) — cf. migration 049.
const edlIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant EDL invalide');

const edlCreateRules = [
    body('lot_id').notEmpty().withMessage('lot_id est obligatoire').bail().isInt({ min: 1 }).withMessage('lot_id invalide'),
    body('type_edl').notEmpty().withMessage('type_edl est obligatoire').bail().isIn(TYPES_EDL).withMessage('type_edl invalide (entree, sortie, intermediaire)'),
    body('date_realisation').optional({ nullable: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('location_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('location_id invalide'),
    body('locataire_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('locataire_id invalide'),
    body('locataire_name').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Nom locataire invalide'),
    body('locataire_present').optional({ nullable: true }).isBoolean().withMessage('locataire_present doit être un booléen'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
    body('parent_edl_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('parent_edl_id invalide'),
];
const edlItemCreateRules = [
    edlIdParam,
    body('piece').notEmpty().withMessage('piece est obligatoire').bail().isString().isLength({ max: 100 }).withMessage('piece invalide'),
    body('nom').notEmpty().withMessage('nom est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('nom invalide'),
    body('etat').notEmpty().withMessage('etat est obligatoire').bail().isIn(ETATS_ITEM).withMessage('etat invalide'),
    body('inventory_item_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('inventory_item_id invalide'),
    body('categorie').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('catégorie invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('description trop longue'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const edlItemUpdateRules = [
    edlIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
    body('etat').optional({ nullable: true }).isIn(ETATS_ITEM).withMessage('etat invalide'),
    body('quantite').optional({ nullable: true }).isInt({ min: 0 }).withMessage('quantité invalide'),
    body('observation').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('observation trop longue'),
    body('photos').optional({ nullable: true }).isArray().withMessage('photos doit être un tableau'),
];
const edlItemDeleteRules = [
    edlIdParam,
    param('itemId').isInt({ min: 1 }).withMessage('Identifiant item invalide'),
];
const edlSignRules = [
    edlIdParam,
    body('signatures').exists({ checkNull: true }).withMessage('signatures requis'),
];
const edlUpdateRules = [
    edlIdParam,
    body('statut').optional({ nullable: true }).isIn(STATUTS_EDL).withMessage('statut invalide'),
    body('commentaires').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Commentaires trop longs'),
];

// Protect all routes with auth check and RLS context
router.use(protect);
router.use(tenantGuard);

// ─── Isolation par propriétaire (défense en profondeur) ──────────────────────
// On filtre explicitement par owner_id en plus de la RLS : le rôle DB peut avoir
// BYPASSRLS (cf. locataireRoutes), auquel cas la RLS seule ne protège pas. Ce helper
// concatène la clause et pousse le paramètre, en respectant la numérotation $N.
// Admin : accès global (pas de clause). Gestionnaire sans owner : ANY('{}') → 0 ligne.
function scopeByOwner(req: AuthenticatedRequest, params: any[], col = 'owner_id'): string {
    if ((req as any).userRole === 'admin') return '';
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    params.push(validOwnerIds);
    return ` AND ${col} = ANY($${params.length}::int[])`;
}

// ─── Moteur de comparaison entrée / sortie (VIII.6) ──────────────────────────
// Gravité croissante des états (alignée sur le CdC : Neuf < Bon < Moyen < Mauvais,
// 'usager' = 'moyen', 'hs' = pire). Sert à calculer l'écart entrée→sortie.
const ETAT_RANK: Record<string, number> = { neuf: 0, bon: 1, usager: 2, moyen: 2, mauvais: 3, hs: 4 };
const etatRank = (etat?: string): number => ETAT_RANK[(etat || '').toLowerCase()] ?? 0;

// Clé d'appariement d'un élément entre les deux EDL : pièce + nom (normalisés).
const itemKey = (it: any): string => `${(it.piece || '').trim().toLowerCase()}::${(it.nom || '').trim().toLowerCase()}`;

type CompStatut = 'degradation' | 'amelioration' | 'inchange' | 'manquant' | 'ajoute';

// Compare les éléments d'un EDL d'entrée et d'un EDL de sortie.
// Statuts : degradation (état pire), amelioration (meilleur), inchange,
// manquant (présent à l'entrée, absent à la sortie), ajoute (apparu à la sortie).
function buildComparison(itemsEntree: any[], itemsSortie: any[]) {
    const mapE = new Map(itemsEntree.map((i) => [itemKey(i), i]));
    const mapS = new Map(itemsSortie.map((i) => [itemKey(i), i]));
    const keys = new Set([...mapE.keys(), ...mapS.keys()]);

    const summary = { total: 0, degradations: 0, ameliorations: 0, inchanges: 0, manquants: 0, ajoutes: 0 };
    const comparison: any[] = [];

    for (const key of keys) {
        const e = mapE.get(key);
        const s = mapS.get(key);
        const base = e || s;
        let statut: CompStatut;
        let delta = 0;

        if (e && s) {
            delta = etatRank(s.etat) - etatRank(e.etat);
            statut = delta > 0 ? 'degradation' : delta < 0 ? 'amelioration' : 'inchange';
        } else if (e) {
            statut = 'manquant';
        } else {
            statut = 'ajoute';
        }

        summary.total++;
        if (statut === 'degradation') summary.degradations++;
        else if (statut === 'amelioration') summary.ameliorations++;
        else if (statut === 'inchange') summary.inchanges++;
        else if (statut === 'manquant') summary.manquants++;
        else summary.ajoutes++;

        comparison.push({
            piece: base.piece,
            nom: base.nom,
            statut,
            delta,
            etat_entree: e?.etat ?? null,
            etat_sortie: s?.etat ?? null,
            observation_entree: e?.observation ?? null,
            observation_sortie: s?.observation ?? null,
            photos_entree: e?.photos ?? [],
            photos_sortie: s?.photos ?? [],
        });
    }

    // Dégradations en tête (base du rapport de retenue), puis manquants, etc.
    const order: Record<CompStatut, number> = { degradation: 0, manquant: 1, ajoute: 2, amelioration: 3, inchange: 4 };
    comparison.sort((a, b) =>
        (order[a.statut as CompStatut] - order[b.statut as CompStatut]) ||
        String(a.piece).localeCompare(String(b.piece)) ||
        String(a.nom).localeCompare(String(b.nom))
    );

    return { comparison, summary };
}

// ============================================
// GET /api/edl - Liste des états des lieux
// ============================================
router.get('/', permissions.canRead('biens'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { lot_id, type_edl, statut } = req.query;

        // Colonnes explicites (pas e.*) : on exclut signatures_json (JSONB lourd, base64)
        // pour ne pas alourdir la liste — il n'est utile que sur le détail.
        let query = `
            SELECT e.id, e.ref_edl, e.lot_id, e.location_id, e.type_edl, e.date_realisation,
                   e.agent_id, e.agent_name, e.locataire_id, e.locataire_name, e.locataire_present,
                   e.statut, e.commentaires, e.parent_edl_id, e.validated_at, e.owner_id,
                   e.created_at, e.updated_at,
                   l.ref_lot, l.type as lot_type,
                   (SELECT COUNT(*) FROM edl_items WHERE edl_id = e.id) as item_count
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            WHERE 1=1 AND e.deleted_at IS NULL
        `;
        const params: any[] = [];
        query += scopeByOwner(req, params, 'e.owner_id');

        if (lot_id) {
            params.push(lot_id);
            query += ` AND e.lot_id = $${params.length}`;
        }

        if (type_edl) {
            params.push(type_edl);
            query += ` AND e.type_edl = $${params.length}`;
        }

        if (statut) {
            params.push(statut);
            query += ` AND e.statut = $${params.length}`;
        }

        query += ` ORDER BY e.date_realisation DESC, e.created_at DESC`;

        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/rented-lots - Lots actuellement loués (bail actif/signé) + locataire.
// Sert le sélecteur de création : on ne fait un EDL que sur un lot occupé.
// NB: déclarée AVANT GET /:id, sinon 'rented-lots' serait capté comme un :id.
// ============================================
router.get('/rented-lots', permissions.canRead('biens'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const params: any[] = [];
        const ownerClause = scopeByOwner(req, params, 'b.owner_id');
        const result = await dbClient.query(`
            SELECT DISTINCT ON (l.id)
                   l.id   AS lot_id,
                   l.ref_lot AS reference,
                   b.nom  AS immeuble,
                   l.type,
                   lease.id AS lease_id,
                   TRIM(COALESCE(t.nom, '') || ' ' || COALESCE(t.prenoms, '')) AS locataire_name
            FROM leases lease
            JOIN lots l       ON lease.lot_id = l.id
            JOIN buildings b  ON l.building_id = b.id
            JOIN tenants t    ON lease.tenant_id = t.id
            WHERE lease.statut IN ('actif', 'signe')${ownerClause}
            ORDER BY l.id, lease.date_debut DESC
        `, params);

        // DISTINCT ON impose un ORDER BY l.id en premier ; on retrie pour l'affichage.
        const lots = result.rows.sort((a: any, b: any) =>
            String(a.immeuble).localeCompare(String(b.immeuble)) ||
            String(a.reference || '').localeCompare(String(b.reference || ''))
        );
        res.json({ lots });
    } catch (error) {
        console.error('Error fetching rented lots:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/lot/:lotId/inventory-items - Éléments du dernier inventaire d'un lot.
// Permet de pré-remplir un EDL depuis l'inventaire de référence (CdC VIII.3).
// ============================================
router.get('/lot/:lotId/inventory-items',
    permissions.canRead('biens'),
    validate([param('lotId').isInt({ min: 1 }).withMessage('lotId invalide')]),
    async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { lotId } = req.params;

        const params: any[] = [lotId];
        const ownerClause = scopeByOwner(req, params, 'owner_id');
        const inv = await dbClient.query(
            `SELECT id FROM inventories
             WHERE entity_type = 'lot' AND entity_id = $1${ownerClause}
             ORDER BY date_realisation DESC, created_at DESC
             LIMIT 1`,
            params
        );
        if (inv.rows.length === 0) {
            return res.json({ inventory_id: null, items: [] });
        }
        const items = await dbClient.query(
            `SELECT id AS inventory_item_id, categorie, nom, etat, description, observation
             FROM inventory_items
             WHERE inventory_id = $1
             ORDER BY categorie, nom`,
            [inv.rows[0].id]
        );
        res.json({ inventory_id: inv.rows[0].id, items: items.rows });
    } catch (error) {
        console.error('Error fetching lot inventory items:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/:id - Détails complets d'un EDL
// ============================================
router.get('/:id', permissions.canRead('biens'), validate([edlIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        // Get EDL Header
        const params: any[] = [id];
        const ownerClause = scopeByOwner(req, params, 'e.owner_id');
        const edlResult = await dbClient.query(`
            SELECT e.*,
                   l.ref_lot, l.type as lot_type,
                   'Bail #' || loc.id as ref_location,
                   parent.ref_edl as parent_ref
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN leases loc ON e.location_id = loc.id
            LEFT JOIN edl_inspections parent ON e.parent_edl_id = parent.id
            WHERE e.id = $1${ownerClause}
        `, params);

        if (edlResult.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }

        const edl = edlResult.rows[0];

        // Get Items
        const itemsResult = await dbClient.query(`
            SELECT * FROM edl_items
            WHERE edl_id = $1
            ORDER BY piece, nom
        `, [id]);

        res.json({
            ...edl,
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching EDL details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/:id/counterpart - EDL de type opposé (entrée↔sortie) du même bail/lot
// Permet à l'UI de proposer « Comparer » sans demander manuellement les deux ids.
// ============================================
router.get('/:id/counterpart', permissions.canRead('biens'), validate([edlIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        const params: any[] = [id];
        const ownerClause = scopeByOwner(req, params, 'e.owner_id');
        const src = await dbClient.query(
            `SELECT id, type_edl, lot_id, location_id FROM edl_inspections e WHERE e.id = $1${ownerClause}`,
            params
        );
        if (src.rows.length === 0) {
            return res.status(404).json({ message: 'EDL introuvable ou accès refusé' });
        }
        const cur = src.rows[0];
        const opposite = cur.type_edl === 'sortie' ? 'entree' : 'sortie';

        // Priorité au même bail (location_id) ; à défaut, le même lot. On exclut l'EDL source.
        const p2: any[] = [opposite, cur.lot_id, cur.location_id, cur.id];
        const ownerClause2 = scopeByOwner(req, p2, 'owner_id');
        const cp = await dbClient.query(
            `SELECT id, ref_edl, type_edl, date_realisation, statut
             FROM edl_inspections
             WHERE type_edl = $1 AND id <> $4
               AND ( ($3 IS NOT NULL AND location_id = $3) OR lot_id = $2 )${ownerClause2}
             ORDER BY ($3 IS NOT NULL AND location_id = $3) DESC, date_realisation DESC
             LIMIT 1`,
            p2
        );

        res.json({
            source: { id: cur.id, type_edl: cur.type_edl },
            counterpart: cp.rows[0] || null,
        });
    } catch (error) {
        console.error('Error finding EDL counterpart:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/:id/pdf - Document EDL officiel (PDF serveur, CdC VIII.10)
// ============================================
router.get('/:id/pdf', permissions.canRead('biens'), validate([edlIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const params: any[] = [id];
        const ownerClause = scopeByOwner(req, params, 'e.owner_id');
        const edlResult = await dbClient.query(
            `SELECT e.*, l.ref_lot, l.type as lot_type
             FROM edl_inspections e
             LEFT JOIN lots l ON e.lot_id = l.id
             WHERE e.id = $1${ownerClause}`,
            params
        );
        if (edlResult.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        const items = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [id]);
        await streamEdlPdf(res, edlResult.rows[0], items.rows);
    } catch (error) {
        console.error('Error generating EDL pdf:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/compare/:idEntree/:idSortie/pdf - Rapport comparatif (PDF serveur)
// ============================================
router.get('/compare/:idEntree/:idSortie/pdf',
    permissions.canRead('biens'),
    validate([
        param('idEntree').isInt({ min: 1 }).withMessage('idEntree invalide'),
        param('idSortie').isInt({ min: 1 }).withMessage('idSortie invalide'),
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { idEntree, idSortie } = req.params;

        const pE: any[] = [idEntree];
        const cE = scopeByOwner(req, pE, 'e.owner_id');
        const edlEntree = await dbClient.query(`SELECT e.*, l.ref_lot FROM edl_inspections e LEFT JOIN lots l ON e.lot_id = l.id WHERE e.id = $1${cE}`, pE);
        const pS: any[] = [idSortie];
        const cS = scopeByOwner(req, pS, 'e.owner_id');
        const edlSortie = await dbClient.query(`SELECT e.*, l.ref_lot FROM edl_inspections e LEFT JOIN lots l ON e.lot_id = l.id WHERE e.id = $1${cS}`, pS);

        if (edlEntree.rows.length === 0 || edlSortie.rows.length === 0) {
            return res.status(404).json({ message: 'Un ou plusieurs EDL introuvables ou accès refusé' });
        }

        const itemsE = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idEntree]);
        const itemsS = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idSortie]);
        const { comparison, summary } = buildComparison(itemsE.rows, itemsS.rows);

        await streamComparePdf(res, { entree: edlEntree.rows[0], sortie: edlSortie.rows[0], comparison, summary });
    } catch (error) {
        console.error('Error generating compare pdf:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// POST /api/edl - Créer un nouvel état des lieux
// ============================================
router.post('/', permissions.canWrite('biens'), validate(edlCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const isAdmin = (req as any).userRole === 'admin';
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];
        const {
            lot_id,
            location_id,
            type_edl,
            date_realisation,
            locataire_id,
            locataire_name,
            locataire_present,
            commentaires,
            parent_edl_id
        } = req.body;

        // L'owner fait foi via le lot inspecté (lot → immeuble.owner_id). On ne se fie pas à
        // resolvedOwnerId qui est null pour un gestionnaire multi-owner sans owner_id explicite.
        const lotRes = await dbClient.query(
            `SELECT b.owner_id FROM lots l JOIN buildings b ON l.building_id = b.id WHERE l.id = $1`,
            [lot_id]
        );
        if (lotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable ou accès refusé' });
        }
        const ownerId = lotRes.rows[0].owner_id;
        // Vérif d'appartenance : empêche de créer un EDL sur le lot d'un autre propriétaire.
        if (!isAdmin && !validOwnerIds.includes(ownerId)) {
            return res.status(403).json({ message: 'Accès refusé à ce lot.' });
        }

        // Rattachement automatique au bail actif/signé du lot (et à son locataire) si non fourni :
        // lie l'EDL au contrat réel et permet la comparaison entrée/sortie (#7).
        const leaseRes = await dbClient.query(
            `SELECT l.id AS lease_id, t.user_id AS locataire_user_id, t.nom, t.prenoms
             FROM leases l
             JOIN tenants t ON l.tenant_id = t.id
             WHERE l.lot_id = $1 AND l.statut IN ('actif', 'signe')
             ORDER BY l.date_debut DESC
             LIMIT 1`,
            [lot_id]
        );
        const lease = leaseRes.rows[0];
        const finalLocationId   = location_id || lease?.lease_id || null;
        const finalLocataireId  = locataire_id || lease?.locataire_user_id || null;
        const finalLocataireName = locataire_name || (lease ? [lease.nom, lease.prenoms].filter(Boolean).join(' ') : '');

        // Générer référence unique
        const year = new Date().getFullYear();
        const seqResult = await dbClient.query(`SELECT nextval('edl_ref_seq')`);
        const seq = seqResult.rows[0].nextval;
        const ref_edl = `EDL-${year}-${String(seq).padStart(4, '0')}`;

        // Nom de l'agent sans « undefined » si prenoms est absent.
        const agentName = [req.user?.nom, req.user?.prenoms].filter(Boolean).join(' ');

        const result = await dbClient.query(`
            INSERT INTO edl_inspections (
                ref_edl, lot_id, location_id, type_edl, date_realisation,
                agent_id, agent_name, locataire_id, locataire_name,
                locataire_present, commentaires, parent_edl_id, owner_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            ref_edl,
            lot_id,
            finalLocationId,
            type_edl,
            date_realisation || new Date(),
            req.user?.id,
            agentName,
            finalLocataireId,
            finalLocataireName,
            locataire_present !== false,
            commentaires || '',
            parent_edl_id || null,
            ownerId
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupère l'EDL (id + statut) s'il existe ET appartient à l'utilisateur, sinon null.
// Centralise l'isolation owner ET sert au verrouillage (un EDL non-brouillon est figé).
async function fetchOwnedEdl(req: AuthenticatedRequest, edlId: string | undefined): Promise<{ id: number; statut: string } | null> {
    const dbClient = (req as any).dbClient;
    const params: any[] = [edlId];
    const clause = scopeByOwner(req, params);
    const r = await dbClient.query(`SELECT id, statut FROM edl_inspections WHERE id = $1${clause}`, params);
    return r.rows[0] || null;
}

// Un EDL n'est modifiable (éléments, commentaires) qu'en brouillon : une fois signé/
// clôturé/archivé, c'est une preuve figée. Renvoie un message de verrouillage sinon.
const LOCK_MESSAGE = "État des lieux verrouillé : déjà signé ou clôturé, les éléments ne sont plus modifiables.";

// Transitions de statut autorisées (la signature passe par /sign, pas par ici).
const STATUT_TRANSITIONS: Record<string, string[]> = {
    brouillon: ['archive'],
    signe: ['cloture', 'archive'],
    cloture: ['archive'],
    archive: [],
};

// ============================================
// POST /api/edl/:id/items - Ajouter/Modifier des items
// ============================================
router.post('/:id/items', permissions.canWrite('biens'), validate(edlItemCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        const parent = await fetchOwnedEdl(req, id);
        if (!parent) {
            return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }
        if (parent.statut !== 'brouillon') {
            return res.status(409).json({ message: LOCK_MESSAGE });
        }

        const {
            inventory_item_id,
            piece,
            categorie,
            nom,
            description,
            etat,
            quantite,
            observation,
            photos
        } = req.body;

        const result = await dbClient.query(`
            INSERT INTO edl_items (
                edl_id, inventory_item_id, piece, categorie, nom,
                description, etat, quantite, observation, photos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            id,
            inventory_item_id || null,
            piece,
            categorie || '',
            nom,
            description || '',
            etat,
            quantite || 1,
            observation || '',
            JSON.stringify(photos || [])
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/items/:itemId - Modifier un item
// ============================================
router.put('/:id/items/:itemId', permissions.canWrite('biens'), validate(edlItemUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        const parent = await fetchOwnedEdl(req, id);
        if (!parent) {
            return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }
        if (parent.statut !== 'brouillon') {
            return res.status(409).json({ message: LOCK_MESSAGE });
        }

        const { etat, quantite, observation, photos } = req.body;

        const result = await dbClient.query(`
            UPDATE edl_items SET
                etat = COALESCE($1, etat),
                quantite = COALESCE($2, quantite),
                observation = COALESCE($3, observation),
                photos = COALESCE($4, photos)
            WHERE id = $5 AND edl_id = $6
            RETURNING *
        `, [
            etat,
            quantite,
            observation,
            photos ? JSON.stringify(photos) : null,
            itemId,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// DELETE /api/edl/:id/items/:itemId - Supprimer un item
// ============================================
router.delete('/:id/items/:itemId', permissions.canWrite('biens'), validate(edlItemDeleteRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id, itemId } = req.params;

        const parent = await fetchOwnedEdl(req, id);
        if (!parent) {
            return res.status(404).json({ message: 'État des lieux parent introuvable ou accès refusé' });
        }
        if (parent.statut !== 'brouillon') {
            return res.status(409).json({ message: LOCK_MESSAGE });
        }

        const result = await dbClient.query('DELETE FROM edl_items WHERE id = $1 AND edl_id = $2 RETURNING id', [itemId, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        res.json({ message: 'Élément supprimé' });
    } catch (error) {
        console.error('Error deleting EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// DELETE /api/edl/:id - Déplacer un état des lieux vers la corbeille (soft-delete)
// ============================================
router.delete('/:id', permissions.canWrite('biens'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        // fetchOwnedEdl valide l'existence ET l'appartenance (anti-IDOR).
        const owned = await fetchOwnedEdl(req, id);
        if (!owned) {
            return res.status(404).json({ message: 'État des lieux introuvable ou accès refusé' });
        }
        await dbClient.query(
            'UPDATE edl_inspections SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL',
            [id, req.userId]
        );
        res.json({ message: 'État des lieux déplacé vers la corbeille' });
    } catch (error) {
        console.error('Error deleting EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/sign - Enregistrer les signatures
// ============================================
router.put('/:id/sign', permissions.canWrite('biens'), validate(edlSignRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { signatures } = req.body;

        const edl = await fetchOwnedEdl(req, id);
        if (!edl) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        if (edl.statut !== 'brouillon') {
            return res.status(409).json({ message: 'État des lieux déjà signé ou verrouillé.' });
        }

        const params: any[] = [JSON.stringify(signatures), id];
        const ownerClause = scopeByOwner(req, params);
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                signatures_json = $1,
                statut = 'signe',
                validated_at = NOW()
            WHERE id = $2${ownerClause}
            RETURNING *
        `, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error signing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id - Mettre à jour un EDL (statut, commentaires)
// ============================================
router.put('/:id', permissions.canWrite('biens'), validate(edlUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        const { statut, commentaires } = req.body;

        const edl = await fetchOwnedEdl(req, id);
        if (!edl) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }
        // Transition de statut contrôlée (clôture/archivage), pas de retour arrière.
        if (statut && statut !== edl.statut && !(STATUT_TRANSITIONS[edl.statut] || []).includes(statut)) {
            return res.status(409).json({ message: `Transition de statut non autorisée (${edl.statut} → ${statut}).` });
        }
        // Les commentaires ne sont éditables qu'en brouillon (preuve figée après signature).
        if (commentaires !== undefined && edl.statut !== 'brouillon') {
            return res.status(409).json({ message: LOCK_MESSAGE });
        }

        const params: any[] = [statut, commentaires, id];
        const ownerClause = scopeByOwner(req, params);
        const result = await dbClient.query(`
            UPDATE edl_inspections SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                updated_at = NOW()
            WHERE id = $3${ownerClause}
            RETURNING *
        `, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/compare/:idEntree/:idSortie - Comparaison Entrée/Sortie
// ============================================
router.get('/compare/:idEntree/:idSortie',
    permissions.canRead('biens'),
    validate([
        param('idEntree').isInt({ min: 1 }).withMessage('idEntree invalide'),
        param('idSortie').isInt({ min: 1 }).withMessage('idSortie invalide'),
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { idEntree, idSortie } = req.params;

        // Get both EDLs (isolation explicite par owner, en plus de la RLS)
        const pEntree: any[] = [idEntree];
        const edlEntree = await dbClient.query(`SELECT * FROM edl_inspections WHERE id = $1${scopeByOwner(req, pEntree)}`, pEntree);
        const pSortie: any[] = [idSortie];
        const edlSortie = await dbClient.query(`SELECT * FROM edl_inspections WHERE id = $1${scopeByOwner(req, pSortie)}`, pSortie);

        if (edlEntree.rows.length === 0 || edlSortie.rows.length === 0) {
            return res.status(404).json({ message: 'Un ou plusieurs EDL introuvables ou accès refusé' });
        }

        // Get items for both
        const itemsEntree = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idEntree]);
        const itemsSortie = await dbClient.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idSortie]);

        // Moteur de diff : appariement par pièce+élément, écarts d'état, dégradations (VIII.6).
        const { comparison, summary } = buildComparison(itemsEntree.rows, itemsSortie.rows);

        res.json({
            entree: {
                ...edlEntree.rows[0],
                items: itemsEntree.rows
            },
            sortie: {
                ...edlSortie.rows[0],
                items: itemsSortie.rows
            },
            comparison,
            summary
        });
    } catch (error) {
        console.error('Error comparing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
