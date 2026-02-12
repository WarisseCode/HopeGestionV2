import pool from '../db/database';

export class RecoveryService {

    // Check for unpaid rents and create recovery missions
    static async generateRecoveryMissions() {
        console.log('Starting automated recovery mission generation...');

        try {
            // 1. Find payments overdue by > 10 days with no active recovery mission
            const overduePayments = await pool.query(
                `SELECT ps.id, ps.lease_id, ps.total_amount, ps.due_date, l.tenant_id, t.nom, t.prenoms
                 FROM payment_schedules ps
                 JOIN leases l ON ps.lease_id = l.id
                 JOIN tenants t ON l.tenant_id = t.id
                 LEFT JOIN recovery_missions rm ON ps.id = rm.payment_schedule_id
                 WHERE ps.status = 'impayé'
                 AND ps.due_date < NOW() - INTERVAL '10 days'
                 AND rm.id IS NULL`
            );

            console.log(`Found ${overduePayments.rows.length} overdue payments eligible for recovery.`);

            for (const payment of overduePayments.rows) {
                await this.createMission(payment);
            }

        } catch (error) {
            console.error('Error generating recovery missions:', error);
        }
    }

    private static async createMission(payment: any) {
        try {
            // 2. Assign Agent Logic (Simple Round Robin or specific rule)
            // For MVP, we assign to the first available agent with role 'agent_recouvrement'
            // In production, this should be smarter (geo-location based, workload based)

            const agentResult = await pool.query(
                `SELECT u.id FROM users u
                 JOIN user_roles ur ON u.id = ur.user_id
                 WHERE ur.role = 'agent_recouvrement'
                 LIMIT 1`
            );

            const agentId = agentResult.rows.length > 0 ? agentResult.rows[0].id : null;

            // 3. Create the mission
            await pool.query(
                `INSERT INTO recovery_missions
                (lease_id, payment_schedule_id, agent_id, status, priority, amount_due, assigned_at, notes)
                VALUES (, , , 'assigned', 'high', , NOW(), 'Mission générée automatiquement par le système due à un retard > 10 jours.')`,
                [payment.lease_id, payment.id, agentId, payment.total_amount]
            );

            console.log(`Created recovery mission for payment #${payment.id} (Tenant: ${payment.nom}). Assigned to Agent: ${agentId || 'Unassigned'}`);

            // 4. Send Notification to Agent (Mock)
            if (agentId) {
                console.log(`[NOTIFICATION] Sending WhatsApp to Agent ${agentId}: New recovery mission for ${payment.total_amount} FCFA`);
            }

        } catch (error) {
            console.error(`Failed to create mission for payment ${payment.id}:`, error);
        }
    }
}
