// backend/routes/taxRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params ou req.body.

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import permissions from '../middleware/permissionMiddleware';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);

// La fiscalité est PAR propriétaire : un gestionnaire multi-propriétaires choisit explicitement
// l'owner concerné dans l'UI. On valide cet owner_id contre validOwnerIds (anti-IDOR), avec repli
// sur resolvedOwnerId (owner unique) puis sur l'unique propriétaire géré.
// `forbidden` = owner_id demandé hors périmètre → 403 ; ownerId null = aucun owner déterminable → 400.
function pickOwner(req: AuthenticatedRequest, requestedRaw: any): { ownerId: number | null; forbidden: boolean } {
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    const resolved = (req as any).resolvedOwnerId;
    if (requestedRaw != null && requestedRaw !== '') {
        const c = parseInt(String(requestedRaw), 10);
        if (Number.isNaN(c) || !validOwnerIds.includes(c)) return { ownerId: null, forbidden: true };
        return { ownerId: c, forbidden: false };
    }
    if (resolved != null) return { ownerId: resolved, forbidden: false };
    if (validOwnerIds.length === 1) return { ownerId: validOwnerIds[0] ?? null, forbidden: false };
    return { ownerId: null, forbidden: false };
}

// Paramètres fiscaux : tous optionnels (upsert) mais strictement typés.
// tax_rate borné 0-100 pour empêcher un taux aberrant ; vat_subject booléen.
const taxSettingsRules = [
    body('owner_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('owner_id invalide'),
    body('fiscal_regime').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Régime fiscal invalide'),
    body('tax_rate').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('Taux invalide (0-100)'),
    body('vat_subject').optional({ nullable: true }).isBoolean().withMessage('vat_subject doit être un booléen'),
    body('country').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Pays invalide'),
];

// GET /api/tax/settings — Get fiscal settings for the active tenant
// [SÉCURITÉ] ownerId résolu via tenantGuard — jamais depuis req.params
router.get('/settings', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const { ownerId, forbidden } = pickOwner(req, req.query.owner_id);
    if (forbidden) return res.status(403).json({ message: 'Propriétaire non autorisé.' });
    if (!ownerId) return res.status(400).json({ message: 'Propriétaire requis.' });
    try {
        const result = await dbClient.query(
            'SELECT * FROM tax_settings WHERE owner_id = $1',
            [ownerId]
        );

        if (result.rows.length === 0) {
            return res.json({ owner_id: ownerId, fiscal_regime: 'reel', tax_rate: 0 });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching tax settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tax/settings — Save fiscal settings for the active tenant
// [SÉCURITÉ] owner_id depuis resolvedOwnerId — jamais depuis req.body
router.post('/settings', permissions.canWrite('finance'), tenantGuard, validate(taxSettingsRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const { ownerId, forbidden } = pickOwner(req, req.body.owner_id);
    if (forbidden) return res.status(403).json({ message: 'Propriétaire non autorisé.' });
    if (!ownerId) return res.status(400).json({ message: 'Propriétaire requis.' });
    try {
        const { fiscal_regime, tax_rate, vat_subject, country } = req.body;

        await dbClient.query('BEGIN');
        try {
            // Contexte RLS (transaction-local) sur l'owner ciblé pour la WITH CHECK en multi-owner.
            await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(ownerId)]);
            const result = await dbClient.query(`
                INSERT INTO tax_settings (owner_id, fiscal_regime, tax_rate, vat_subject, country, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (owner_id)
                DO UPDATE SET
                    fiscal_regime = EXCLUDED.fiscal_regime,
                    tax_rate = EXCLUDED.tax_rate,
                    vat_subject = EXCLUDED.vat_subject,
                    country = EXCLUDED.country,
                    updated_at = NOW()
                RETURNING *
            `, [ownerId, fiscal_regime, tax_rate, vat_subject, country]);
            await dbClient.query('COMMIT');
            res.json(result.rows[0]);
        } catch (txErr) {
            await dbClient.query('ROLLBACK');
            throw txErr;
        }
    } catch (error) {
        console.error('Error saving tax settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/tax/report/:year — Generate fiscal report for the active tenant
// [SÉCURITÉ] ownerId résolu via tenantGuard — jamais depuis req.params
router.get('/report/:year', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const { ownerId, forbidden } = pickOwner(req, req.query.owner_id);
    if (forbidden) return res.status(403).json({ message: 'Propriétaire non autorisé.' });
    if (!ownerId) return res.status(400).json({ message: 'Propriétaire requis.' });
    try {
        const { year } = req.params;

        // [RLS] dbClient filtre automatiquement par owner_id via get_current_owner_id()
        // Le WHERE owner_id = $1 reste en défense en profondeur

        const incomeRes = await dbClient.query(`
            SELECT COALESCE(SUM(montant), 0) as total_income
            FROM payments
            WHERE owner_id = $1
            AND EXTRACT(YEAR FROM date_paiement) = $2
            AND statut = 'valide'
        `, [ownerId, year]);

        const expenseRes = await dbClient.query(`
            SELECT COALESCE(SUM(e.amount), 0) as total_expenses
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category = ec.name
            WHERE e.owner_id = $1
            AND EXTRACT(YEAR FROM e.date_expense) = $2
            AND ec.is_deductible = true
        `, [ownerId, year]);

        const loanInterestRes = await dbClient.query(`
            SELECT COALESCE(SUM(lp.amount_interest), 0) as total_interest
            FROM loan_payments lp
            JOIN loans l ON lp.loan_id = l.id
            WHERE l.owner_id = $1
            AND EXTRACT(YEAR FROM lp.payment_date) = $2
            AND lp.status = 'paid'
        `, [ownerId, year]);

        const total_income = parseFloat(incomeRes.rows[0].total_income);
        const total_expenses = parseFloat(expenseRes.rows[0].total_expenses);
        const total_interest = parseFloat(loanInterestRes.rows[0].total_interest);
        const taxable_income = Math.max(0, total_income - total_expenses - total_interest);

        res.json({
            year,
            owner_id: ownerId,
            income: total_income,
            deductible_expenses: total_expenses,
            loan_interest: total_interest,
            taxable_base: taxable_income,
            details: {}
        });

    } catch (error) {
        console.error('Error generating tax report:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
