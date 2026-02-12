// backend/services/RentPaymentService.ts
// Service for handling online rent payments via FedaPay

import pool from '../db/database';
import { fedapayService } from './fedapayService';
import { receiptService } from './ReceiptService';
import type { PaymentOperator, CreatePaymentRequest } from './fedapayService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PaymentScheduleInfo {
    id: number;
    lease_id: number;
    tenant_id: number;
    total_amount: number;
    amount_paid: number;
    due_date: string;
    status: string;
    description: string;
    pending_transaction_id?: number | null;
}

export interface CreateRentPaymentRequest {
    scheduleId: number;
    tenantId: number;
    operator: PaymentOperator;
}

export interface RentPaymentResult {
    success: boolean;
    message: string;
    transactionId: number | null;
    paymentUrl: string | null;
    fedapayTransactionId: string | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class RentPaymentService {

    /**
     * Get pending payment schedules for a lease
     */
    async getPendingSchedules(leaseId: number): Promise<PaymentScheduleInfo[]> {
        const result = await pool.query(`
            SELECT 
                ps.id,
                ps.lease_id,
                l.tenant_id,
                ps.total_amount,
                ps.amount_paid,
                ps.due_date,
                ps.status,
                ps.description
            FROM payment_schedules ps
            JOIN leases l ON ps.lease_id = l.id
            WHERE ps.lease_id = $1
            AND ps.status IN ('pending', 'partial', 'overdue')
            ORDER BY ps.due_date ASC
        `, [leaseId]);

        return result.rows;
    }

    /**
     * Create a payment link for a rent payment schedule
     */
    async createPaymentLink(request: CreateRentPaymentRequest): Promise<RentPaymentResult> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get schedule details
            const scheduleRes = await client.query(`
                SELECT 
                    ps.id,
                    ps.lease_id,
                    ps.total_amount,
                    ps.amount_paid,
                    ps.description,
                    l.tenant_id,
                    t.nom,
                    t.prenoms,
                    t.email,
                    t.telephone_principal as telephone
                FROM payment_schedules ps
                JOIN leases l ON ps.lease_id = l.id
                JOIN tenants t ON l.tenant_id = t.id
                WHERE ps.id = $1 AND t.user_id = $2
            `, [request.scheduleId, request.tenantId]); // request.tenantId is actually userId

            if (scheduleRes.rows.length === 0) {
                throw new Error('Échéance introuvable ou non autorisée');
            }

            const schedule = scheduleRes.rows[0];
            const amountDue = parseFloat(schedule.total_amount) - parseFloat(schedule.amount_paid || 0);

            if (amountDue <= 0) {
                throw new Error('Cette échéance est déjà payée');
            }

            // 2. Check for existing pending transaction
            const existingRes = await client.query(`
                SELECT id, payment_url, fedapay_transaction_id
                FROM rent_payment_transactions
                WHERE schedule_id = $1 
                AND status = 'pending'
                AND created_at > NOW() - INTERVAL '1 hour'
                ORDER BY created_at DESC
                LIMIT 1
            `, [request.scheduleId]);

            // If there's a recent pending transaction, reuse it
            if (existingRes.rows.length > 0) {
                const existing = existingRes.rows[0];
                await client.query('COMMIT');
                return {
                    success: true,
                    message: 'Lien de paiement existant réutilisé',
                    transactionId: existing.id,
                    paymentUrl: existing.payment_url,
                    fedapayTransactionId: existing.fedapay_transaction_id
                };
            }

            // 3. Create FedaPay transaction
            // We use the tenant_id from the schedule/lease, NOT the request (which is userId)
            const fedapayRequest: CreatePaymentRequest = {
                userId: schedule.tenant_id, 
                userEmail: schedule.email || 'locataire@hopegestion.com',
                userPhone: schedule.telephone || '',
                userName: `${schedule.prenoms} ${schedule.nom}`,
                amount: amountDue,
                operator: request.operator,
                plan: {
                    planId: request.scheduleId,
                    planName: schedule.description || 'Loyer',
                    planType: 'rent',
                    durationMonths: 1
                },
                internalReference: `RENT_${request.scheduleId}_${Date.now()}`
            };

            const fedapayResult = await fedapayService.createPaymentTransaction(fedapayRequest);

            if (!fedapayResult.success) {
                throw new Error(fedapayResult.message || 'Erreur lors de la création de la transaction FedaPay');
            }

            // 4. Record transaction in DB
            const insertRes = await client.query(`
                INSERT INTO rent_payment_transactions (
                    schedule_id, tenant_id, amount, status, payment_url, fedapay_transaction_id
                ) VALUES ($1, $2, $3, 'pending', $4, $5)
                RETURNING id
            `, [request.scheduleId, schedule.tenant_id, amountDue, fedapayResult.paymentUrl, fedapayResult.transactionId]);

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Lien de paiement créé avec succès',
                transactionId: insertRes.rows[0].id,
                paymentUrl: fedapayResult.paymentUrl,
                fedapayTransactionId: fedapayResult.transactionId
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('[RentPaymentService] Error creating payment link:', error);
            return {
                success: false,
                message: error.message || 'Erreur lors de la création du lien de paiement',
                transactionId: null,
                paymentUrl: null,
                fedapayTransactionId: null
            };
        } finally {
            client.release();
        }
    }

    /**
     * Process payment confirmation from FedaPay webhook
     */
    async processPaymentConfirmation(fedapayTransactionId: string, status: 'approved' | 'failed' | 'cancelled'): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get transaction details
            const transactionRes = await client.query(`
                SELECT id, schedule_id, lease_id, tenant_id, amount, status
                FROM rent_payment_transactions
                WHERE fedapay_transaction_id = $1
            `, [fedapayTransactionId]);

            if (transactionRes.rows.length === 0) {
                console.warn(`[RentPaymentService] Transaction not found: ${fedapayTransactionId}`);
                await client.query('ROLLBACK');
                return;
            }

            const transaction = transactionRes.rows[0];

            // Idempotency check: if already approved, don't process again
            if (transaction.status === 'approved' && status === 'approved') {
                console.log(`[RentPaymentService] Transaction ${fedapayTransactionId} already approved. Skipping.`);
                await client.query('COMMIT');
                return;
            }

            // 2. Update transaction status
            await client.query(`
                UPDATE rent_payment_transactions
                SET status = $1, paid_at = $2, updated_at = NOW()
                WHERE id = $3
            `, [status, status === 'approved' ? new Date() : null, transaction.id]);

            // 3. If approved, create payment record and update schedule
            if (status === 'approved') {
                // Check if payment already exists (double safety)
                const paymentExists = await client.query('SELECT id FROM payments WHERE reference_transaction = $1', [fedapayTransactionId]);
                
                if (paymentExists.rows.length === 0) {
                    // Create payment entry
                    await client.query(`
                        INSERT INTO payments (
                            lease_id,
                            schedule_id,
                            montant,
                            date_paiement,
                            mode_paiement,
                            reference_transaction,
                            type,
                            statut,
                            description,
                            owner_id
                        )
                        SELECT 
                            $1, $2, $3, NOW(), 'mobile_money', $4, 'loyer', 'valide',
                            'Paiement en ligne via Mobile Money',
                            l.owner_id
                        FROM leases l
                        WHERE l.id = $5
                    `, [
                        transaction.lease_id,
                        transaction.schedule_id,
                        transaction.amount,
                        fedapayTransactionId,
                        transaction.lease_id
                    ]);

                    // Update payment schedule to paid/partial
                    const scheduleRes = await client.query(`
                        SELECT total_amount, amount_paid
                        FROM payment_schedules
                        WHERE id = $1
                    `, [transaction.schedule_id]);

                    const schedule = scheduleRes.rows[0];
                    const newPaidAmount = parseFloat(schedule.amount_paid || 0) + parseFloat(transaction.amount);
                    const newStatus = newPaidAmount >= parseFloat(schedule.total_amount) ? 'paid' : 'partial';

                    await client.query(`
                        UPDATE payment_schedules
                        SET amount_paid = $1, status = $2, updated_at = NOW()
                        WHERE id = $3
                    `, [newPaidAmount, newStatus, transaction.schedule_id]);

                    console.log(`[RentPaymentService] Payment confirmed for schedule ${transaction.schedule_id}`);

                    // Generate PDF receipt logic ...
                    // (We can call generateReceipt asynchronously or let the user fetch it later)
                }
            }

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[RentPaymentService] Error processing payment confirmation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Manually verify transaction status with FedaPay
     * Useful for local development or if webhook fails
     */
    async verifyTransactionStatus(transactionId: number, userId: number): Promise<{ success: boolean; status: string; message: string }> {
        // 1. Get transaction info
        const result = await pool.query(`
            SELECT rpt.id, rpt.fedapay_transaction_id, rpt.status, t.user_id
            FROM rent_payment_transactions rpt
            JOIN tenants t ON rpt.tenant_id = t.id
            WHERE rpt.id = $1 AND t.user_id = $2
        `, [transactionId, userId]);

        if (result.rows.length === 0) {
             throw new Error('Transaction introuvable ou non autorisée');
        }

        const transaction = result.rows[0];
        const fedapayId = transaction.fedapay_transaction_id;

        if (!fedapayId) {
            return { success: false, status: transaction.status, message: 'ID FedaPay manquant' };
        }

        // 2. Call FedaPay API
        try {
            const fedapayStatusRes = await fedapayService.getTransactionStatus(fedapayId);
            const fedapayStatus = fedapayStatusRes.status; // 'approved', 'pending', etc.

            if (fedapayStatus === 'error') {
                 return { success: false, status: transaction.status, message: 'Erreur communication FedaPay' };
            }

            // 3. Update local DB if status changed
            // We map FedaPay status to our status
            if (fedapayStatus !== transaction.status) {
                // Only process specific statuses
                if (['approved', 'declined', 'cancelled', 'failed'].includes(fedapayStatus)) {
                    await this.processPaymentConfirmation(fedapayId, fedapayStatus as any);
                    return { success: true, status: fedapayStatus, message: `Statut mis à jour: ${fedapayStatus}` };
                }
            }

            return { success: true, status: fedapayStatus, message: 'Statut inchangé' };

        } catch (error: any) {
            console.error('[RentPaymentService] Verify error:', error);
            return { success: false, status: transaction.status, message: 'Erreur lors de la vérification' };
        }
    }

    /**
     * Get payment transaction history for a tenant
     */
    async getTransactionHistory(tenantId: number, limit: number = 20): Promise<any[]> {
        const result = await pool.query(`
            SELECT 
                rpt.id,
                rpt.amount,
                rpt.status,
                rpt.payment_method,
                rpt.created_at,
                rpt.paid_at,
                ps.description,
                ps.due_date
            FROM rent_payment_transactions rpt
            JOIN payment_schedules ps ON rpt.schedule_id = ps.id
            WHERE rpt.tenant_id = $1
            ORDER BY rpt.created_at DESC
            LIMIT $2
        `, [tenantId, limit]);

        return result.rows;
    }

    /**
     * Get pending schedules for a logged-in user (resolves tenant_id)
     */
    async getPendingSchedulesForUser(userId: number): Promise<PaymentScheduleInfo[]> {
        // 1. Resolve Tenant ID
        const tenantRes = await pool.query(
            'SELECT id FROM tenants WHERE user_id = $1',
            [userId]
        );

        if (tenantRes.rows.length === 0) {
            console.warn(`[RentPaymentService] No tenant profile found for User ${userId}`);
            return [];
        }

        const tenantId = tenantRes.rows[0].id;

        // 2. Find active lease(s)
        const leasesRes = await pool.query(
            "SELECT id FROM leases WHERE tenant_id = $1 AND statut = 'actif'",
            [tenantId]
        );

        if (leasesRes.rows.length === 0) {
            return [];
        }

        // 3. Get schedules for all active leases
        const leaseIds = leasesRes.rows.map(r => r.id);
        
        const result = await pool.query(`
            SELECT 
                ps.id,
                ps.lease_id,
                ps.total_amount,
                ps.amount_paid,
                ps.due_date,
                ps.status,
                ps.description,
                (
                    SELECT id 
                    FROM rent_payment_transactions rpt 
                    WHERE rpt.schedule_id = ps.id 
                    AND rpt.status = 'pending' 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as pending_transaction_id
            FROM payment_schedules ps
            WHERE ps.lease_id = ANY($1) 
            AND ps.status IN ('pending', 'overdue', 'partial')
            ORDER BY ps.due_date ASC
        `, [leaseIds]);

        return result.rows.map(row => ({
            ...row,
            total_amount: parseFloat(row.total_amount),
            amount_paid: parseFloat(row.amount_paid || '0'),
            tenant_id: tenantId,
            pending_transaction_id: row.pending_transaction_id
        }));
    }

    /**
     * Get receipt URL for a completed rent payment transaction
     */
    async getReceiptUrl(transactionId: number, userId: number): Promise<{ success: boolean; receiptUrl?: string; message?: string }> {
        // userId here corresponds to req.userId
        const result = await pool.query(`
            SELECT 
                p.quittance_url
            FROM rent_payment_transactions rpt
            JOIN payments p ON p.reference_transaction = rpt.fedapay_transaction_id
            JOIN tenants t ON rpt.tenant_id = t.id
            WHERE rpt.id = $1 
            AND t.user_id = $2
            AND rpt.status = 'approved'
        `, [transactionId, userId]);

        if (result.rows.length === 0 || !result.rows[0].quittance_url) {
            return {
                success: false,
                message: 'Quittance non disponible'
            };
        }

        return {
            success: true,
            receiptUrl: result.rows[0].quittance_url
        };
    }
}

// Export singleton
export const rentPaymentService = new RentPaymentService();
