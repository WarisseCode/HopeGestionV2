// backend/scripts/seedContracts.ts
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { addDays, subMonths, format } from 'date-fns';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function seedContracts() {
    try {
        console.log('🌱 Seeding Contracts...');

        // 1. Get a tenant and a lot
        const tenantRes = await pool.query("SELECT id FROM users WHERE email = 'locataire@gmail.com' LIMIT 1");
        const lotRes = await pool.query("SELECT id FROM lots LIMIT 1");
        
        if (tenantRes.rowCount === 0 || lotRes.rowCount === 0) {
            console.log('❌ Tenant or Lot not found. Run seed script first.');
            return;
        }

        const tenantId = tenantRes.rows[0].id;
        const lotId = lotRes.rows[0].id;

        // 2. Clear existing contracts for clean test
        await pool.query('DELETE FROM contracts');

        // 3. Create Contract 1: Expiring in 30 days (Should trigger Expiration Alert)
        const dateDebut1 = format(subMonths(new Date(), 11), 'yyyy-MM-dd');
        const dateFin1 = format(addDays(new Date(), 30), 'yyyy-MM-dd'); // Exactly 30 days from now
        
        await pool.query(
            `INSERT INTO contracts (reference, tenant_id, lot_id, date_debut, date_fin, loyer_mensuel, status) 
             VALUES ($1, $2, $3, $4, $5, 100000, 'actif')`,
            ['CTR-EXPIRE-30', tenantId, lotId, dateDebut1, dateFin1]
        );
        console.log('✅ Created Contract expiring in 30 days (CTR-EXPIRE-30)');

        // 4. Create Contract 2: Active, No payment for this month (Should trigger Late Payment Alert if date > 5th)
        // We simulate that rent is due on the 5th. Today is likely > 5th.
        const dateDebut2 = format(subMonths(new Date(), 2), 'yyyy-MM-dd');
        const dateFin2 = format(addDays(new Date(), 300), 'yyyy-MM-dd');
        
        await pool.query(
            `INSERT INTO contracts (reference, tenant_id, lot_id, date_debut, date_fin, loyer_mensuel, status) 
             VALUES ($1, $2, $3, $4, $5, 150000, 'actif')`,
            ['CTR-LATE-PAYMENT', tenantId, lotId, dateDebut2, dateFin2]
        );
        console.log('✅ Created Contract with potential late payment (CTR-LATE-PAYMENT)');

        console.log('✨ Contracts seeded successfully.');
        
    } catch (error) {
        console.error('❌ Error seeding contracts:', error);
    } finally {
        await pool.end();
    }
}

seedContracts();
