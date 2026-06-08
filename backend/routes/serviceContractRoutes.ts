import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { protect } from '../middleware/authMiddleware';
// [RLS] Isolation garantie par PostgreSQL Row-Level Security via tenantGuard.
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';

const router = express.Router();

// title obligatoire ; le reste optionnel mais typé (cost_monthly >= 0, dates ISO).
const contractCreateRules = [
    body('title').notEmpty().withMessage('Le titre est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('Titre trop long'),
    body('provider_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('provider_id invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Description trop longue'),
    body('cost_monthly').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Coût invalide'),
    body('start_date').optional({ nullable: true }).isISO8601().withMessage('Date de début invalide (ISO 8601)'),
    body('end_date').optional({ nullable: true }).isISO8601().withMessage('Date de fin invalide (ISO 8601)'),
    body('status').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Statut invalide'),
];
const contractUpdateRules = [
    param('id').isInt({ min: 1 }).withMessage('Identifiant invalide'),
    body('title').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Titre trop long'),
    body('provider_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('provider_id invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Description trop longue'),
    body('cost_monthly').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Coût invalide'),
    body('start_date').optional({ nullable: true }).isISO8601().withMessage('Date de début invalide (ISO 8601)'),
    body('end_date').optional({ nullable: true }).isISO8601().withMessage('Date de fin invalide (ISO 8601)'),
    body('status').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Statut invalide'),
];

// [RLS] Contrats globaux (owner_id IS NULL) supprimés.
// Tout contrat doit appartenir à un owner.
// Le RLS filtre automatiquement par tenant actif.
// GET /api/service-contracts
router.get('/', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        const query = `
            SELECT sc.*, p.name as provider_name 
            FROM service_contracts sc
            LEFT JOIN providers p ON sc.provider_id = p.id
            ORDER BY sc.start_date DESC`;
        
        const result = await dbClient.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement contrats' });
    }
});

// POST /api/service-contracts
router.post('/', protect, tenantGuard, validate(contractCreateRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const resolvedOwnerId = (req as any).resolvedOwnerId;
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;

        const result = await dbClient.query(
            `INSERT INTO service_contracts (owner_id, provider_id, title, description, cost_monthly, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [resolvedOwnerId, provider_id, title, description, cost_monthly, start_date, end_date, status || 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création contrat' });
    }
});

// PUT /api/service-contracts/:id
router.put('/:id', protect, tenantGuard, validate(contractUpdateRules), async (req: any, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { provider_id, title, description, cost_monthly, start_date, end_date, status } = req.body;
        const id = req.params.id;

        const result = await dbClient.query(
            `UPDATE service_contracts SET provider_id=$1, title=$2, description=$3, cost_monthly=$4, start_date=$5, end_date=$6, status=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`,
            [provider_id, title, description, cost_monthly, start_date, end_date, status, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contrat introuvable ou accès refusé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification contrat' });
    }
});

// DELETE /api/service-contracts/:id
router.delete('/:id', protect, tenantGuard, async (req: any, res) => {
    try {
        const dbClient = (req as any).dbClient;
        // On modifie ici par un RETURNING id pour identifier si la suppression a réussi 
        const result = await dbClient.query('DELETE FROM service_contracts WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contrat introuvable ou accès refusé' });
        }
        res.json({ message: 'Contrat supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — serviceContractRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ La table service_contracts a été ajoutée à migration_rls.sql.
 * ✅ Suppression totale de IS NULL pour les contrats globaux ; le RLS exige un propriétaire pour chaque table métier.
 * ✅ Correction complète des failles d'escalade de privilège (IDOR) sur l'UPDATE et le DELETE avec le passage au dbClient.query. Un 404 est retourné si l'accès est refusé.
 * ✅ owner_id est récupéré depuis le resolvedOwnerId du JWT et ne provient plus jamais du client lors d'un POST.
 * ✅ L'helper de vérification manuelle getManagedOwnerId a été retiré.
 * ═══════════════════════════════════════════════════
 */

export default router;
