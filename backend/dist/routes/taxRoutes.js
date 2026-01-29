"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// GET /api/tax/settings/:ownerId - Get settings
router.get('/settings/:ownerId', permissionMiddleware_1.default.canRead('finances'), async (req, res) => {
    try {
        const { ownerId } = req.params;
        const result = await database_1.default.query('SELECT * FROM tax_settings WHERE owner_id = $1', [ownerId]);
        if (result.rows.length === 0) {
            // Return default empty config
            return res.json({ owner_id: ownerId, fiscal_regime: 'reel', tax_rate: 0 });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching tax settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/tax/settings - Save settings
router.post('/settings', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    try {
        const { owner_id, fiscal_regime, tax_rate, vat_subject, country } = req.body;
        const result = await database_1.default.query(`
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
        `, [owner_id, fiscal_regime, tax_rate, vat_subject, country]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error saving tax settings:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/tax/report/:ownerId/:year - Generate Report
router.get('/report/:ownerId/:year', permissionMiddleware_1.default.canRead('finances'), async (req, res) => {
    try {
        const { ownerId, year } = req.params;
        // 1. Revenus (Payments table)
        // Note: owner_id is on leases table, so join is needed, but payments table has owner_id column now per migration?
        // Let's check schema. inspect_finance_db said payments has owner_id
        const incomeRes = await database_1.default.query(`
            SELECT COALESCE(SUM(montant), 0) as total_income
            FROM payments
            WHERE owner_id = $1 
            AND EXTRACT(YEAR FROM date_paiement) = $2
            AND statut = 'valide'
        `, [ownerId, year]);
        // 2. Charges (Expenses table)
        // Need to check deductible (assuming all categorized expenses are deductible for now or join category)
        const expenseRes = await database_1.default.query(`
            SELECT COALESCE(SUM(e.amount), 0) as total_expenses
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category = ec.name
            WHERE e.owner_id = $1
            AND EXTRACT(YEAR FROM e.date_expense) = $2
            AND ec.is_deductible = true
        `, [ownerId, year]);
        // 3. Intérêts d'emprunt (Deductible)
        const loanInterestRes = await database_1.default.query(`
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
            details: {
            // Could verify specific expense categories here
            }
        });
    }
    catch (error) {
        console.error('Error generating tax report:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=taxRoutes.js.map