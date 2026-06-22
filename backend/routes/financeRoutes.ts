// backend/routes/financeRoutes.ts
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes passent par req.dbClient fourni par tenantGuard (RLS actif).
// owner_id vient UNIQUEMENT de resolvedOwnerId — jamais depuis req.params, req.query, ou req.body.

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import * as ExcelJS from 'exceljs';
import { FinanceService } from '../services/FinanceService';

const router = Router();

// POST / délègue à FinanceService.createPayment. Les noms de champs DOIVENT correspondre
// au contrat réel (front financeApi.createPayment + interface CreatePaymentData) :
// amount / payment_method / payment_date / reference — et non montant / mode_paiement / etc.,
// sinon la validation rejette tout payload légitime en 400.
const paymentCreateRules = [
    body('lease_id').notEmpty().withMessage('lease_id est obligatoire').bail()
        .isInt({ min: 1 }).withMessage('lease_id invalide'),
    body('amount').notEmpty().withMessage('Le montant est obligatoire').bail()
        .isFloat({ gt: 0 }).withMessage('Le montant doit être un nombre strictement positif'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('payment_method').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Mode de paiement invalide'),
    body('payment_date').optional({ nullable: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
    body('reference').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Référence trop longue'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Description trop longue'),
    body('schedule_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('schedule_id invalide'),
];

// month/year optionnels (défaut = mois/année courants côté handler).
const generateSchedulesRules = [
    body('month').optional({ nullable: true }).isInt({ min: 1, max: 12 }).withMessage('Mois invalide (1-12)'),
    body('year').optional({ nullable: true }).isInt({ min: 2000, max: 2100 }).withMessage('Année invalide'),
];

// :id de l'échéance + champs de règlement optionnels typés.
const payScheduleRules = [
    param('id').isInt({ min: 1 }).withMessage("Identifiant d'échéance invalide"),
    body('montant').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('Montant invalide'),
    body('mode_paiement').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Mode de paiement invalide'),
    body('date_paiement').optional({ nullable: true }).isISO8601().withMessage('Date invalide (ISO 8601)'),
];

// GET /api/finances - Liste des paiements
router.get('/', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { lease_id, start_date, end_date, statut, type } = req.query;
        const payments = await FinanceService.getPayments(dbClient, ownerId, { lease_id, start_date, end_date, statut, type } as any);
        res.json({ payments });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/finances - Enregistrer un paiement
router.post('/', permissions.canWrite('finance'), tenantGuard, validate(paymentCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const payment = await FinanceService.createPayment(dbClient, ownerId, req.body, req.userId!);
        res.status(201).json(payment);
    } catch (error: any) {
        console.error('Error recording payment:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Erreur enregistrement paiement' });
    }
});

// GET /api/finances/stats - Statistiques mensuelles
router.get('/stats', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const targetMonth = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
        const targetYear  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();
        const stats = await FinanceService.getStats(dbClient, ownerId, targetMonth, targetYear);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/stats/monthly - Revenus/Dépenses par mois (graphiques)
router.get('/stats/monthly', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const months = parseInt(req.query.months as string) || 6;
        const data = await FinanceService.getMonthlyStats(dbClient, ownerId, months);
        res.json(data);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/stats/building/:id - Statistiques par immeuble
router.get('/stats/building/:id', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const result = await FinanceService.getBuildingStats(dbClient, ownerId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        console.error('Error fetching building stats:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Erreur serveur' });
    }
});

// GET /api/finances/export/excel - Export Excel des paiements
// La mise en forme ExcelJS reste dans la route — c'est du rendu HTTP, pas de la logique métier.
router.get('/export/excel', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const ownerId = (req as any).resolvedOwnerId;
    try {
        const { start_date, end_date } = req.query;
        const rows = await FinanceService.getPaymentsForExport(
            dbClient, ownerId,
            start_date as string | undefined,
            end_date   as string | undefined
        );

        const workbook  = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Paiements');

        worksheet.columns = [
            { header: 'Date',      key: 'date',      width: 15 },
            { header: 'Locataire', key: 'locataire', width: 25 },
            { header: 'Immeuble',  key: 'immeuble',  width: 20 },
            { header: 'Lot',       key: 'lot',       width: 10 },
            { header: 'Type',      key: 'type',      width: 15 },
            { header: 'Montant',   key: 'montant',   width: 15 },
            { header: 'Mode',      key: 'mode',      width: 15 },
            { header: 'Référence', key: 'ref',       width: 20 },
            { header: 'Statut',    key: 'statut',    width: 12 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        rows.forEach((p: any) => {
            worksheet.addRow({
                date:     new Date(p.date_paiement).toLocaleDateString('fr-FR'),
                locataire: `${p.locataire_prenoms} ${p.locataire_nom}`,
                immeuble: p.immeuble_nom,
                lot:      p.ref_lot,
                type:     p.type,
                montant:  parseFloat(p.montant),
                mode:     p.mode_paiement,
                ref:      p.reference_transaction,
                statut:   p.statut,
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Rapport_Financier_${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting excel:', error);
        res.status(500).json({ message: "Erreur lors de l'exportation" });
    }
});

// POST /api/finances/generate-schedules - Générer les échéances mensuelles (Admin/Gest)
// ⚠️ FinanceService utilise pool en interne — pas de dbClient ici (hors tenantGuard)
router.post('/generate-schedules', permissions.canWrite('finance'), validate(generateSchedulesRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { month, year } = req.body;
        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear  = year  ? parseInt(year)  : new Date().getFullYear();
        const result = await FinanceService.generateMonthlySchedules(targetMonth, targetYear);
        res.json({ message: 'Génération terminée', details: result });
    } catch (error) {
        console.error('Error generating schedules:', error);
        res.status(500).json({ message: 'Erreur lors de la génération des échéances' });
    }
});

// GET /api/finances/schedules - Liste des échéances avec infos locataire
router.get('/schedules', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const ownerId       = (req as any).resolvedOwnerId;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    try {
        const targetMonth = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
        const targetYear  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();

        const effectiveOwnerIds: number[] = ownerId != null ? [ownerId] : validOwnerIds;
        if (effectiveOwnerIds.length === 0) return res.json([]);

        const rows = await FinanceService.getSchedules(dbClient, effectiveOwnerIds, targetMonth, targetYear);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ message: 'Erreur chargement échéances' });
    }
});

// PUT /api/finances/schedules/:id/pay - Marquer une échéance comme payée
router.put('/schedules/:id/pay', permissions.canWrite('finance'), tenantGuard, validate(payScheduleRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient      = (req as any).dbClient;
    const ownerId       = (req as any).resolvedOwnerId;
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    try {
        const effectiveOwnerIds: number[] = ownerId != null ? [ownerId] : validOwnerIds;
        if (effectiveOwnerIds.length === 0) {
            return res.status(403).json({ message: 'Aucun propriétaire associé à ce compte.' });
        }

        const { schedule, receiptUrl } = await FinanceService.paySchedule(
            dbClient, req.params.id as string, effectiveOwnerIds, req.body
        );
        res.json({ message: 'Échéance marquée comme payée', schedule, receiptUrl });
    } catch (error: any) {
        console.error('Error paying schedule:', error);
        res.status(error.statusCode || 500).json({
            message: error.message || 'Erreur paiement échéance',
            details: String(error),
        });
    }
});

export default router;
