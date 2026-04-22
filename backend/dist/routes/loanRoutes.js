"use strict";
// backend/routes/loanRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params, req.query, ou req.body.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// GET /api/loans - List loans for the active tenant
// [SÉCURITÉ] owner_id depuis resolvedOwnerId — req.query.owner_id supprimé (IDOR)
router.get('/', permissionMiddleware_1.default.canRead('finances'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        const result = await dbClient.query(`
            SELECT l.*,
                   o.name as owner_name,
                   b.nom as building_name,
                   (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as paid_installments,
                   (SELECT SUM(amount_principal) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as capital_repaid
            FROM loans l
            LEFT JOIN owners o ON l.owner_id = o.id
            LEFT JOIN buildings b ON l.building_id = b.id
            WHERE l.owner_id = $1
            ORDER BY l.start_date DESC
        `, [ownerId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/loans/:id - Details & Schedule
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId — empêche l'IDOR cross-tenant
router.get('/:id', permissionMiddleware_1.default.canRead('finances'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        const { id } = req.params;
        const loanRes = await dbClient.query('SELECT * FROM loans WHERE id = $1 AND owner_id = $2', [id, ownerId]);
        if (loanRes.rows.length === 0)
            return res.status(404).json({ message: 'Prêt non trouvé' });
        const scheduleRes = await dbClient.query('SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY due_date ASC', [id]);
        res.json({
            ...loanRes.rows[0],
            schedule: scheduleRes.rows
        });
    }
    catch (error) {
        console.error('Error fetching loan details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/loans - Create loan & generate schedule
// [SÉCURITÉ] owner_id depuis resolvedOwnerId — req.body.owner_id supprimé (IDOR)
router.post('/', permissionMiddleware_1.default.canWrite('finances'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        await dbClient.query('BEGIN');
        const { name, amount, interest_rate, duration_months, start_date, building_id, day_of_month } = req.body;
        // 1. Calculate Monthly Payment (PMT)
        const r = (parseFloat(interest_rate) / 12) / 100;
        const n = parseInt(duration_months);
        const P = parseFloat(amount);
        let monthly_payment = 0;
        if (r === 0) {
            monthly_payment = P / n;
        }
        else {
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
            start_date, (0, date_fns_1.addMonths)(new Date(start_date), n),
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
            if (remainingBalance < 0)
                remainingBalance = 0;
            const dueDate = (0, date_fns_1.addMonths)(new Date(start_date), i);
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
    }
    catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error creating loan:', error);
        res.status(500).json({ message: 'Erreur création prêt' });
    }
});
// PUT /api/loans/:id/close - Close/Complete a loan
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId avant clôture
router.put('/:id/close', permissionMiddleware_1.default.canWrite('finances'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        await dbClient.query('BEGIN');
        const { id } = req.params;
        // [SÉCURITÉ] Vérifie que le prêt appartient à cet owner — empêche l'IDOR cross-tenant
        const loanRes = await dbClient.query('SELECT * FROM loans WHERE id = $1 AND owner_id = $2', [id, ownerId]);
        if (loanRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Prêt non trouvé' });
        }
        if (loanRes.rows[0].status === 'paid') {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Prêt déjà clôturé' });
        }
        await dbClient.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);
        await dbClient.query(`UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE loan_id = $1 AND status = 'pending'`, [id]);
        await dbClient.query('COMMIT');
        res.json({ message: 'Prêt clôturé avec succès' });
    }
    catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error closing loan:', error);
        res.status(500).json({ message: 'Erreur clôture prêt' });
    }
});
// PUT /api/loans/:id/installment/:paymentId/pay - Mark an installment as paid
// [SÉCURITÉ] Vérification loans.owner_id = resolvedOwnerId avant tout traitement
router.put('/:id/installment/:paymentId/pay', permissionMiddleware_1.default.canWrite('finances'), tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const ownerId = req.resolvedOwnerId;
    try {
        await dbClient.query('BEGIN');
        const { id, paymentId } = req.params;
        // [SÉCURITÉ] Vérifie que le prêt appartient à cet owner — empêche l'IDOR cross-tenant
        const loanCheck = await dbClient.query('SELECT id FROM loans WHERE id = $1 AND owner_id = $2', [id, ownerId]);
        if (loanCheck.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Prêt non trouvé' });
        }
        const installmentRes = await dbClient.query('SELECT * FROM loan_payments WHERE id = $1 AND loan_id = $2', [paymentId, id]);
        if (installmentRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ message: 'Échéance non trouvée' });
        }
        if (installmentRes.rows[0].status === 'paid') {
            await dbClient.query('ROLLBACK');
            return res.status(400).json({ message: 'Échéance déjà payée' });
        }
        await dbClient.query(`UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE id = $1`, [paymentId]);
        // Auto-close loan if all installments are now paid
        const remainingRes = await dbClient.query(`SELECT COUNT(*) as remaining FROM loan_payments WHERE loan_id = $1 AND status != 'paid'`, [id]);
        if (parseInt(remainingRes.rows[0].remaining) === 0) {
            await dbClient.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);
        }
        await dbClient.query('COMMIT');
        res.json({ message: 'Échéance payée', installment: { ...installmentRes.rows[0], status: 'paid' } });
    }
    catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Error paying installment:', error);
        res.status(500).json({ message: 'Erreur paiement échéance' });
    }
});
exports.default = router;
