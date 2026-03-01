"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// GET /api/loans - List loans
router.get('/', permissionMiddleware_1.default.canRead('finances'), async (req, res) => {
    try {
        const { owner_id } = req.query;
        let query = `
            SELECT l.*, 
                   o.name as owner_name,
                   b.nom as building_name,
                   (SELECT COUNT(*) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as paid_installments,
                   (SELECT SUM(amount_principal) FROM loan_payments WHERE loan_id = l.id AND status = 'paid') as capital_repaid
            FROM loans l
            LEFT JOIN owners o ON l.owner_id = o.id
            LEFT JOIN buildings b ON l.building_id = b.id
            WHERE 1=1
        `;
        const params = [];
        if (owner_id) {
            query += ` AND l.owner_id = $1`;
            params.push(owner_id);
        }
        query += ` ORDER BY l.start_date DESC`;
        const result = await database_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/loans/:id - Details & Schedule
router.get('/:id', permissionMiddleware_1.default.canRead('finances'), async (req, res) => {
    try {
        const { id } = req.params;
        const loanRes = await database_1.default.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0)
            return res.status(404).json({ message: 'Prêt non trouvé' });
        const scheduleRes = await database_1.default.query('SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY due_date ASC', [id]);
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
router.post('/', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const { name, amount, interest_rate, duration_months, start_date, owner_id, building_id, day_of_month } = req.body;
        // 1. Calculate Monthly Payment (PMT)
        // r = annual rate / 12 / 100
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
        const insertRes = await client.query(`
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
            owner_id || null, building_id || null
        ]);
        const loan = insertRes.rows[0];
        // 3. Generate Schedule
        let remainingBalance = P;
        let currentDate = new Date(start_date);
        for (let i = 1; i <= n; i++) {
            // Interest for this month
            const interestPart = remainingBalance * r;
            let principalPart = monthly_payment - interestPart;
            // Adjust last payment
            if (i === n) {
                principalPart = remainingBalance;
                monthly_payment = principalPart + interestPart;
            }
            remainingBalance -= principalPart;
            if (remainingBalance < 0)
                remainingBalance = 0;
            // Set due date (next month)
            currentDate = (0, date_fns_1.addMonths)(new Date(start_date), i);
            await client.query(`
                INSERT INTO loan_payments (
                    loan_id, due_date, amount_total, amount_principal, amount_interest, status
                ) VALUES ($1, $2, $3, $4, $5, 'pending')
            `, [
                loan.id,
                currentDate,
                monthly_payment,
                principalPart,
                interestPart
            ]);
        }
        await client.query('COMMIT');
        res.status(201).json(loan);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating loan:', error);
        res.status(500).json({ message: 'Erreur création prêt' });
    }
    finally {
        client.release();
    }
});
// PUT /api/loans/:id/close - Close/Complete a loan
router.put('/:id/close', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        // Verify loan exists and is active
        const loanRes = await client.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanRes.rows.length === 0)
            return res.status(404).json({ message: 'Prêt non trouvé' });
        if (loanRes.rows[0].status === 'paid')
            return res.status(400).json({ message: 'Prêt déjà clôturé' });
        // Update loan status
        await client.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);
        // Mark all remaining pending installments as paid
        await client.query(`UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE loan_id = $1 AND status = 'pending'`, [id]);
        await client.query('COMMIT');
        res.json({ message: 'Prêt clôturé avec succès' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error closing loan:', error);
        res.status(500).json({ message: 'Erreur clôture prêt' });
    }
    finally {
        client.release();
    }
});
// PUT /api/loans/:id/installment/:paymentId/pay - Mark an installment as paid
router.put('/:id/installment/:paymentId/pay', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const { id, paymentId } = req.params;
        // Verify installment exists and belongs to this loan
        const installmentRes = await client.query('SELECT * FROM loan_payments WHERE id = $1 AND loan_id = $2', [paymentId, id]);
        if (installmentRes.rows.length === 0)
            return res.status(404).json({ message: 'Échéance non trouvée' });
        if (installmentRes.rows[0].status === 'paid')
            return res.status(400).json({ message: 'Échéance déjà payée' });
        // Mark as paid
        await client.query(`UPDATE loan_payments SET status = 'paid', payment_date = NOW() WHERE id = $1`, [paymentId]);
        // Check if all installments are now paid -> auto-close loan
        const remainingRes = await client.query('SELECT COUNT(*) as remaining FROM loan_payments WHERE loan_id = $1 AND status != $2', [id, 'paid']);
        if (parseInt(remainingRes.rows[0].remaining) === 0) {
            await client.query('UPDATE loans SET status = $1 WHERE id = $2', ['paid', id]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Échéance payée', installment: { ...installmentRes.rows[0], status: 'paid' } });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error paying installment:', error);
        res.status(500).json({ message: 'Erreur paiement échéance' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
