// backend/routes/financeRoutes.ts
import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import * as ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

dotenv.config();

const router = Router();
import pool from '../db/database';

// Helper to select payments with correct aliases
const SELECT_PAYMENTS_FIELDS = `
    p.id,
    p.lease_id,
    p.schedule_id,
    p.montant as amount,
    p.date_paiement as payment_date,
    p.mode_paiement as payment_method,
    p.reference_transaction as reference,
    p.type,
    p.statut,
    p.description,
    p.created_at,
    p.owner_id
`;

// GET /api/finances - Liste des paiements
router.get('/', permissions.canRead('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { lease_id, start_date, end_date, statut, type } = req.query;

        let query = `
            SELECT 
                ${SELECT_PAYMENTS_FIELDS},
                l.reference_bail,
                l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramIndex = 1;

        if (lease_id) {
            query += ` AND p.lease_id = $${paramIndex}`;
            params.push(lease_id);
            paramIndex++;
        }

        if (start_date) {
            query += ` AND p.date_paiement >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND p.date_paiement <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (statut) {
            query += ` AND p.statut = $${paramIndex}`;
            params.push(statut);
            paramIndex++;
        }

        if (type) {
            query += ` AND p.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        query += ` ORDER BY p.date_paiement DESC, p.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ payments: result.rows });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/finances - Enregistrer un paiement
router.post('/', permissions.canWrite('finances'), async (req: AuthenticatedRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            lease_id,
            schedule_id,
            amount,
            payment_date,
            payment_method,
            reference,
            type,
            description
        } = req.body;

        // Validation
        if (!lease_id || !amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Données invalides' });
        }

        // IMPORTANT: Map API fields (English) to DB fields (French)
        const insertRes = await client.query(`
            INSERT INTO payments (
                lease_id, schedule_id, montant, date_paiement, 
                mode_paiement, reference_transaction, type, description, created_by, owner_id
            ) 
            SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, l.owner_id
            FROM leases l WHERE l.id = $1
            RETURNING id, lease_id, schedule_id, montant as amount, date_paiement as payment_date, 
                      mode_paiement as payment_method, reference_transaction as reference, 
                      type, statut, description, created_at
        `, [
            lease_id, schedule_id, amount, payment_date || new Date(),
            payment_method || 'especes', reference, type || 'loyer', 
            description, req.userId
        ]);

        const payment = insertRes.rows[0];

        // Update schedule if linked
        if (schedule_id) {
            // Get current schedule status
            const schedRes = await client.query('SELECT * FROM payment_schedules WHERE id = $1', [schedule_id]);
            const schedule = schedRes.rows[0];

            if (schedule) {
                // payment_schedules uses English columns: total_amount, amount_paid, status, due_date
                const newPaidAmount = parseFloat(schedule.amount_paid || 0) + parseFloat(amount);
                let newStatus = schedule.status;

                if (newPaidAmount >= parseFloat(schedule.total_amount)) {
                    newStatus = 'paid';
                } else if (newPaidAmount > 0) {
                    newStatus = 'partial';
                }

                await client.query(`
                    UPDATE payment_schedules 
                    SET amount_paid = $1, status = $2
                    WHERE id = $3
                `, [newPaidAmount, newStatus, schedule_id]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json(payment);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Erreur enregistrement paiement' });
    } finally {
        client.release();
    }
});

// GET /api/finances/stats - Statistiques
router.get('/stats', permissions.canRead('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Total encashed this month (map montant)
        const encashedRes = await pool.query(`
            SELECT SUM(montant) as total 
            FROM payments 
            WHERE EXTRACT(MONTH FROM date_paiement) = $1 
            AND EXTRACT(YEAR FROM date_paiement) = $2
            AND statut = 'valide'
        `, [currentMonth, currentYear]);

        // Total pending (overdue schedules)
        // payment_schedules columns: total_amount, amount_paid, status, due_date
        const pendingRes = await pool.query(`
            SELECT SUM(total_amount - amount_paid) as total
            FROM payment_schedules
            WHERE status IN ('pending', 'partial', 'overdue')
            AND due_date <= CURRENT_DATE
        `);
        
        res.json({
            encashed_month: parseFloat(encashedRes.rows[0].total || '0'),
            pending_total: parseFloat(pendingRes.rows[0].total || '0')
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/stats/building/:id - Statistiques détaillées par immeuble
router.get('/stats/building/:id', permissions.canRead('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // 1. Taux d'occupation
        const occupancyRes = await pool.query(`
            SELECT 
                COUNT(*) as total_lots,
                COUNT(CASE WHEN statut = 'occupe' THEN 1 END) as occupied_lots
            FROM lots 
            WHERE building_id = $1
        `, [id]);
        
        const { total_lots, occupied_lots } = occupancyRes.rows[0];
        const occupancy_rate = total_lots > 0 ? (occupied_lots / total_lots) * 100 : 0;

        // 2. Performance financière (Ce mois)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const financeRes = await pool.query(`
            SELECT 
                COALESCE(SUM(ps.total_amount), 0) as total_due,
                COALESCE(SUM(ps.amount_paid), 0) as total_paid
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            JOIN lots lo ON l.lot_id = lo.id
            WHERE lo.building_id = $1
            AND EXTRACT(MONTH FROM ps.due_date) = $2
            AND EXTRACT(YEAR FROM ps.due_date) = $3
        `, [id, currentMonth, currentYear]);

        const { total_due, total_paid } = financeRes.rows[0];
        const collection_efficiency = total_due > 0 ? (total_paid / total_due) * 100 : 0;

        res.json({
            building_id: id,
            stats: {
                total_lots: parseInt(total_lots),
                occupied_lots: parseInt(occupied_lots),
                occupancy_rate: Math.round(occupancy_rate * 10) / 10,
                financial_performance: {
                    month: currentMonth,
                    year: currentYear,
                    total_due: parseFloat(total_due),
                    total_paid: parseFloat(total_paid),
                    collection_efficiency: Math.round(collection_efficiency * 10) / 10
                }
            }
        });
    } catch (error) {
        console.error('Error fetching building stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/finances/export/excel - Exportation Excel des paiements
router.get('/export/excel', permissions.canRead('finances'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                p.date_paiement, p.montant, p.mode_paiement, p.reference_transaction, p.type, p.statut,
                l.reference_bail,
                t.nom as locataire_nom, t.prenoms as locataire_prenoms,
                o.name as proprietaire_nom,
                b.nom as immeuble_nom,
                lo.ref_lot
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN owners o ON l.owner_id = o.id
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (start_date) { params.push(start_date); query += ` AND p.date_paiement >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND p.date_paiement <= $${params.length}`; }
        
        query += ` ORDER BY p.date_paiement DESC`;
        const result = await pool.query(query, params);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Paiements');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Locataire', key: 'locataire', width: 25 },
            { header: 'Immeuble', key: 'immeuble', width: 20 },
            { header: 'Lot', key: 'lot', width: 10 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Montant', key: 'montant', width: 15 },
            { header: 'Mode', key: 'mode', width: 15 },
            { header: 'Référence', key: 'ref', width: 20 },
            { header: 'Statut', key: 'statut', width: 12 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        result.rows.forEach(p => {
            worksheet.addRow({
                date: new Date(p.date_paiement).toLocaleDateString('fr-FR'),
                locataire: `${p.locataire_prenoms} ${p.locataire_nom}`,
                immeuble: p.immeuble_nom,
                lot: p.ref_lot,
                type: p.type,
                montant: parseFloat(p.montant),
                mode: p.mode_paiement,
                ref: p.reference_transaction,
                statut: p.statut
            });
        });

        // Set content type and disposition
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Rapport_Financier_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting excel:', error);
        res.status(500).json({ message: 'Erreur lors de l\'exportation' });
    }
});

export default router;
