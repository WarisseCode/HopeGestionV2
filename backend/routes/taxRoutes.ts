// backend/routes/taxRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params ou req.body.

import { Router, Response } from 'express';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import permissions from '../middleware/permissionMiddleware';

const router = Router();

router.use(protect);

// GET /api/tax/settings — Get fiscal settings for the active tenant
// [SÉCURITÉ] ownerId résolu via tenantGuard — jamais depuis req.params
router.get('/settings', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
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
router.post('/settings', permissions.canWrite('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { fiscal_regime, tax_rate, vat_subject, country } = req.body;

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

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error saving tax settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/tax/report/:year — Generate fiscal report for the active tenant
// [SÉCURITÉ] ownerId résolu via tenantGuard — jamais depuis req.params
router.get('/report/:year', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
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
