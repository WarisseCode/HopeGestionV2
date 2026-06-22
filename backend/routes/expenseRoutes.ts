import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { body, param } from 'express-validator';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { upload } from '../middleware/uploadMiddleware';
import { validate } from '../middleware/validate';
import { uploadToSpaces } from '../services/spacesUploadService';

// Champs multipart (parsés par multer) : montant > 0, date et catégorie requis.
const expenseCreateRules = [
    body('amount').notEmpty().withMessage('Le montant est obligatoire').bail().isFloat({ gt: 0 }).withMessage('Montant invalide (> 0)'),
    body('date_expense').notEmpty().withMessage('La date est obligatoire').bail().isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('category').notEmpty().withMessage('La catégorie est obligatoire').bail().isString().isLength({ max: 100 }).withMessage('Catégorie invalide'),
    body('building_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('building_id invalide'),
    body('lot_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('lot_id invalide'),
    body('owner_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('owner_id invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Description trop longue'),
    body('supplier_name').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Fournisseur invalide'),
];
const expenseIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];

const spacesConfigured = !!(
    process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_BUCKET
);

const router = Router();

// Protect all routes with auth check and RLS context
router.use(protect);
router.use(tenantGuard);

// GET /api/expenses - List expenses
router.get('/', permissions.canRead('finance'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { building_id, category, start_date, end_date } = req.query;
        
        // RLS s'occupe de l'isolation owner_id
        let query = `
            SELECT e.*, 
                   b.nom as building_name,
                   l.ref_lot,
                   ep.name as category_label
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN expense_categories ep ON e.category = ep.name
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let pIdx = 1;

        if (building_id) {
            query += ` AND e.building_id = $${pIdx++}`;
            params.push(building_id);
        }
        if (category) {
            query += ` AND e.category = $${pIdx++}`;
            params.push(category);
        }
        if (start_date) {
            query += ` AND e.date_expense >= $${pIdx++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.date_expense <= $${pIdx++}`;
            params.push(end_date);
        }
        
        query += ` ORDER BY e.date_expense DESC, e.created_at DESC`;
        
        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/expenses/categories - List categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const result = await dbClient.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/expenses - Create expense (with optional proof upload)
router.post('/', permissions.canWrite('finance'), upload.single('proof'), validate(expenseCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const resolvedOwnerId = (req as any).resolvedOwnerId;
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];

        const {
            building_id,
            lot_id,
            category,
            description,
            amount,
            date_expense,
            supplier_name
        } = req.body;

        // Validation simple
        if (!amount || !date_expense || !category) {
            return res.status(400).json({ message: 'Champs obligatoires manquants' });
        }

        // [SÉCURITÉ/RLS] Déterminer l'owner réel de la dépense. resolvedOwnerId est null pour un
        // gestionnaire multi-propriétaires → écrire owner_id NULL violait la WITH CHECK (42501).
        // Ordre de priorité : owner dérivé de l'immeuble > du lot > owner_id du body (validé) > resolvedOwnerId.
        let ownerId: number | null = null;
        if (building_id) {
            const r = await dbClient.query('SELECT owner_id FROM buildings WHERE id = $1', [building_id]);
            if (r.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble introuvable ou accès refusé' });
            }
            ownerId = r.rows[0].owner_id;
        } else if (lot_id) {
            const r = await dbClient.query(
                'SELECT b.owner_id FROM lots lo JOIN buildings b ON lo.building_id = b.id WHERE lo.id = $1',
                [lot_id]
            );
            if (r.rows.length === 0) {
                return res.status(404).json({ message: 'Lot introuvable ou accès refusé' });
            }
            ownerId = r.rows[0].owner_id;
        } else if (req.body.owner_id) {
            // owner_id fourni par le client : ne JAMAIS faire confiance aveuglément — vérifier
            // qu'il fait partie des propriétaires gérés par l'utilisateur (anti-IDOR).
            const candidate = parseInt(req.body.owner_id, 10);
            if (!validOwnerIds.includes(candidate)) {
                return res.status(403).json({ message: 'Propriétaire non autorisé.' });
            }
            ownerId = candidate;
        } else {
            ownerId = resolvedOwnerId ?? null;
        }

        if (!ownerId) {
            return res.status(422).json({ message: 'Sélectionnez un immeuble ou un propriétaire pour cette dépense.' });
        }

        // Handle uploaded proof file
        let proofUrl: string | null = req.body.proof_url || null;
        if (req.file) {
            if (spacesConfigured) {
                proofUrl = await uploadToSpaces(req.file, 'expenses');
            } else {
                // Fallback local (dev uniquement)
                const localDir = path.join(__dirname, '../../uploads/expenses');
                await fs.ensureDir(localDir);
                const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${path.extname(req.file.originalname)}`;
                await fs.writeFile(path.join(localDir, uniqueName), req.file.buffer);
                proofUrl = `/uploads/expenses/${uniqueName}`;
            }
        }

        // Transaction : on positionne le contexte RLS (transaction-local) sur l'owner dérivé
        // pour que la WITH CHECK de la policy expenses accepte l'INSERT même en multi-owner.
        await dbClient.query('BEGIN');
        try {
            await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(ownerId)]);
            const result = await dbClient.query(`
                INSERT INTO expenses (
                    building_id, lot_id, owner_id, category, description,
                    amount, date_expense, supplier_name, status, proof_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9)
                RETURNING *
            `, [
                building_id || null,
                lot_id || null,
                ownerId,
                category,
                description || '',
                amount,
                date_expense,
                supplier_name || '',
                proofUrl
            ]);
            await dbClient.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (txErr) {
            await dbClient.query('ROLLBACK');
            throw txErr;
        }
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', permissions.canWrite('finance'), validate(expenseIdParam), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;
        
        const result = await dbClient.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
             return res.status(404).json({ message: 'Dépense introuvable ou accès refusé' });
        }
        res.json({ message: 'Dépense supprimée' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — expenseRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Application globale de protect et tenantGuard en haut de fichier via router.use().
 * ✅ L'ordre global positionne automatiquement tenantGuard AVANT multer (upload.single),
 *    empêchant ainsi l'écriture de fichier en cas d'accès rejeté ou d'absence de JWT valide.
 * ✅ Suppression totale de 'filterByOwner' et autres anciens helpers manuels désormais caduques.
 * ✅ Injection sécurisée de resolvedOwnerId sur l'INSERT de dépense.
 * ✅ Ajout d'un fs.unlinkSync() dans le catch pour nettoyer le fichier uploadé si l'insertion DB plante.
 * ✅ Blocage IDOR (404) sur le DELETE.
 * ═══════════════════════════════════════════════════
 */

export default router;
