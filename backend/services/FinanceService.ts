import pool from '../db/database';

export class FinanceService {
    
    /**
     * Génère les quittances de loyer (Payment Schedules) pour un mois et une année donnés.
     * Pour tous les baux actifs.
     */
    static async generateMonthlySchedules(month: number, year: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            // 1. Sélectionner les baux actifs qui doivent payer ce mois-ci
            // statut = 'actif', date_debut <= fin du mois
            // date_fin >= début du mois ou NULL
            const leasesRes = await client.query(`
                SELECT id, loyer_actuel, charges_mensuelles, jour_echeance, tenant_id 
                FROM leases 
                WHERE statut = 'actif'
                AND date_debut <= $1 
                AND (date_fin IS NULL OR date_fin >= $2)
            `, [endDate, startDate]);

            const leases = leasesRes.rows;
            let generatedCount = 0;

            for (const lease of leases) {
                // Vérifier si une échéance existe déjà pour ce bail et ce mois
                // On check si due_date est dans le mois
                const existingRes = await client.query(`
                    SELECT id FROM payment_schedules 
                    WHERE lease_id = $1 
                    AND EXTRACT(MONTH FROM due_date) = $2 
                    AND EXTRACT(YEAR FROM due_date) = $3
                `, [lease.id, month, year]);

                if (existingRes.rows.length === 0) {
                    // Calcul de la date d'échéance
                    // Si jour_echeance > nombre de jours dans le mois, prendre le dernier jour
                    const daysInMonth = endDate.getDate();
                    const day = Math.min(lease.jour_echeance || 5, daysInMonth); // Défaut le 5
                    const dueDate = new Date(year, month - 1, day);

                    // Calcul montant total
                    const totalAmount = parseFloat(lease.loyer_actuel || 0) + parseFloat(lease.charges_mensuelles || 0);

                    if (totalAmount > 0) {
                        await client.query(`
                            INSERT INTO payment_schedules (
                                lease_id, total_amount, due_date, status, description
                            ) VALUES ($1, $2, $3, 'pending', $4)
                        `, [lease.id, totalAmount, dueDate, `Loyer ${month}/${year}`]);
                        
                        generatedCount++;
                    }
                }
            }

            await client.query('COMMIT');
            return { generated: generatedCount, total_active: leases.length };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
