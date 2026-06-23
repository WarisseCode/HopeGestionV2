// backend/routes/loanRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params, req.query, ou req.body.

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import { addMonths } from 'date-fns';

const router = Router();

router.use(protect);

// Prêt : montant > 0, taux >= 0, durée >= 1 — entrées du calcul d'amortissement.
const loanCreateRules = [
    body('name').notEmpty().withMessage('Le nom est obligatoire').bail().isString().isLength({ max: 200 }).withMessage('Nom trop long'),
    body('amount').notEmpty().withMessage('Le montant est obligatoire').bail().isFloat({ gt: 0 }).withMessage('Montant invalide (> 0)'),
    body('interest_rate').notEmpty().withMessage("Le taux d'intérêt est obligatoire").bail().isFloat({ min: 0 }).withMessage('Taux invalide'),
    body('duration_months').notEmpty().withMessage('La durée est obligatoire').bail().isInt({ min: 1 }).withMessage('Durée invalide'),
    body('start_date').notEmpty().withMessage('La date de début est obligatoire').bail().isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('building_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('building_id invalide'),
    body('owner_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('owner_id invalide'),
    body('day_of_month').optional({ nullable: true }).isInt({ min: 1, max: 31 }).withMessage('Jour du mois invalide (1-31)'),
];

// Propriétaires gérés par l'utilisateur : resolvedOwnerId (owner unique) sinon validOwnerIds
// (gestionnaire multi-propriétaires, où resolvedOwnerId = null). Filtrer par cette liste évite
// les requêtes "owner_id = NULL" qui renvoyaient une liste de prêts vide. Cf. financeRoutes.
function getEffectiveOwnerIds(req: AuthenticatedRequest): number[] {
    const ownerId = (req as any).resolvedOwnerId;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    return ownerId != null ? [ownerId] : validOwnerIds;
}
const loanCloseRules = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];
const loanInstallmentRules = [
    param('id').isInt({ min: 1 }).withMessage('Identifiant prêt invalide'),
    param('paymentId').isInt({ min: 1 }).withMessage('Identifiant échéance invalide'),
];

// GET /api/loans - List loans for the active tenant
// [SÉCURITÉ] owner_id depuis resolvedOwnerId — req.query.owner_id supprimé (IDOR)
router.get('/', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        if (effectiveOwnerIds.length === 0) return res.json([]);
        const result = await dbClient.query(`
            SELECT l.*,
                   o.name as owner_name,
                   b.nom as building_name,
                   (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as paid_installments,
                   (SELECT SUM(amount_principal) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as capital_repaid
            FROM loans l
            LEFT JOIN owners o ON l.owner_id = o.id
            LEFT JOIN buildings b ON l.building_id = b.id
            WHERE l.owner_id = ANY($1::int[])
            ORDER BY l.start_date DESC
        `, [effectiveOwnerIds]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/loans/:id - Details & Schedule
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId — empêche l'IDOR cross-tenant
router.get('/:id', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        const { id } = req.params;
        if (effectiveOwnerIds.length === 0) return res.status(404).json({ message: 'Prêt non trouvé' });

        const loanRes = await dbClient.query(
            'SELECT * FROM loans WHERE id = $1 AND owner_id = ANY($2::int[])',
            [id, effectiveOwnerIds]
        );
        if (loanRes.rows.length === 0) return res.status(404).json({ message: 'Prêt non trouvé' });

        const scheduleRes = await dbClient.query(
            'SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY due_date ASC',
            [id]
        );

        res.json({
            ...loanRes.rows[0],
            schedule: scheduleRes.rows
        });
    } catch (error) {
        console.error('Error fetching loan details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/loans - Create loan & generate schedule
// [SÉCURITÉ] owner_id depuis resolvedOwnerId — req.body.owner_id supprimé (IDOR)
router.post('/', permissions.canWrite('finance'), tenantGuard, validate(loanCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    try {
        const {
            name, amount, interest_rate, duration_months,
            start_date, building_id, day_of_month
        } = req.body;

        // [SÉCURITÉ/RLS] Déterminer l'owner du prêt. resolvedOwnerId est null pour un gestionnaire
        // multi-propriétaires → écrire owner_id NULL violerait la WITH CHECK (42501).
        // Priorité : owner dérivé de l'immeuble > owner_id du body (validé) > owner unique géré.
        let ownerId: number | null = null;
        if (building_id) {
            const r = await dbClient.query('SELECT owner_id FROM buildings WHERE id = $1', [building_id]);
            if (r.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble introuvable ou accès refusé' });
            }
            ownerId = r.rows[0].owner_id;
        } else if (req.body.owner_id) {
            const candidate = parseInt(req.body.owner_id, 10);
            if (!validOwnerIds.includes(candidate)) {
                return res.status(403).json({ message: 'Propriétaire non autorisé.' });
            }
            ownerId = candidate;
        } else if (effectiveOwnerIds.length === 1) {
            ownerId = effectiveOwnerIds[0] ?? null;
        }

        if (!ownerId) {
            return res.status(422).json({ message: 'Précisez le propriétaire concerné par ce prêt.' });
        }

        await dbClient.query('BEGIN');
        // Contexte RLS (transaction-local) sur l'owner dérivé pour la WITH CHECK.
        await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(ownerId)]);

        // 1. Calculate Monthly Payment (PMT)
        const r = (parseFloat(interest_rate) / 12) / 100;
        const n = parseInt(duration_months);
        const P = parseFloat(amount);

        let monthly_payment = 0;
        if (r === 0) {
            monthly_payment = P / n;
        } else {
            monthly_payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        // 2. Insert Loan Header
        const insertRes = await dbClient.query(`
            INSERT INTO loans (
                name, amount, interest_rate, duration_months,
                start_date, end_date, monthly_payment, payment_day,
                owner_id, building_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
            RETURNING *
        `, [
            name, P, interest_rate, n,
            start_date, addMonths(new Date(start_date), n),
            monthly_payment, day_of_month || 5,
            ownerId, building_id || null
        ]);

        const loan = insertRes.rows[0];

        // 3. Generate Schedule
        let remainingBalance = P;

        for (let i = 1; i <= n; i++) {
            const interestPart = remainingBalance * r;
            let principalPart = monthly_payment - interestPart;

            // Adjust last payment for rounding
            if (i === n) {
                principalPart = remainingBalance;
                monthly_payment = principalPart + interestPart;
            }

            remainingBalance -= principalPart;
            if (remainingBalance < 0) remainingBalance = 0;

            const dueDate = addMonths(new Date(start_date), i);

            await dbClient.query(`
                INSERT INTO loan_payments (
                    loan_id, due_date, amount_total, amount_principal, amount_interest, status
                ) VALUES ($1, $2, $3, $4, $5, 'pending')
            `, [
                loan.id,
                dueDate,
                monthly_payment,
                principalPart,
                interestPart
            ]);
        }

        await dbClient.query('COMMIT');
        res.status(201).json(loan);

    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error creating loan:', error);
        res.status(500).json({ message: 'Erreur création prêt' });
    }
});

// PUT /api/loans/:id/close - Close/Complete a loan
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId avant clôture
router.put('/:id/close', permissions.canWrite('finance'), tenantGuard, validate(loanCloseRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        await dbClient.query('BEGIN');

        const { id } = req.params;

        // [SÉCURITÉ] Vérifie que le prêt appartient à l'un des owners gérés — anti-IDOR cross-tenant
        const loanRes = await dbClient.query(
            'SELECT * FROM loans WHERE id = $1 AND owner_id = ANY($2::int[])',
            [id, effectiveOwnerIds]
        );
        if (loanRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Prêt non trouvé' });
        }
        if (loanRes.rows[0].status === 'paid') {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Prêt déjà clôturé' });
        }

        await dbClient.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);

        await dbClient.query(
            `UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE loan_id = $1 AND status = 'pending'`,
            [id]
        );

        await dbClient.query('COMMIT');
        res.json({ message: 'Prêt clôturé avec succès' });
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error closing loan:', error);
        res.status(500).json({ message: 'Erreur clôture prêt' });
    }
});

// PUT /api/loans/:id/installment/:paymentId/pay - Mark an installment as paid
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId avant tout traitement
router.put('/:id/installment/:paymentId/pay', permissions.canWrite('finance'), tenantGuard, validate(loanInstallmentRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const effectiveOwnerIds = getEffectiveOwnerIds(req);
    try {
        await dbClient.query('BEGIN');

        const { id, paymentId } = req.params;

        // [SÉCURITÉ] Vérifie que le prêt appartient à l'un des owners gérés — anti-IDOR cross-tenant
        const loanCheck = await dbClient.query(
            'SELECT id FROM loans WHERE id = $1 AND owner_id = ANY($2::int[])',
            [id, effectiveOwnerIds]
        );
        if (loanCheck.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Prêt non trouvé' });
        }

        const installmentRes = await dbClient.query(
            'SELECT * FROM loan_payments WHERE id = $1 AND loan_id = $2',
            [paymentId, id]
        );
        if (installmentRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Échéance non trouvée' });
        }
        if (installmentRes.rows[0].status === 'paid') {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Échéance déjà payée' });
        }

        await dbClient.query(
            `UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE id = $1`,
            [paymentId]
        );

        // Auto-close loan if all installments are now paid
        const remainingRes = await dbClient.query(
            `SELECT COUNT(*) as remaining FROM loan_payments WHERE loan_id = $1 AND status != 'paid'`,
            [id]
        );
        if (parseInt(remainingRes.rows[0].remaining) === 0) {
            await dbClient.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);
        }

        await dbClient.query('COMMIT');
        res.json({ message: 'Échéance payée', installment: { ...installmentRes.rows[0], status: 'paid' } });
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error paying installment:', error);
        res.status(500).json({ message: 'Erreur paiement échéance' });
    }
});

export default router;
