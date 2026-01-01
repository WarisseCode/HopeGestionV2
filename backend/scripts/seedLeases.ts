// backend/scripts/seedLeases.ts
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { addDays, subMonths, format } from 'date-fns';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function seedLeases() {
    try {
        console.log('🌱 Seeding Automation Test Data...');

        // 1. Create a Test Manager (Owner) if not exists
        const email = 'auto_manager@hope.com';
        const password = 'AutoPass123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        let userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        let userId;

        if (userRes.rows.length === 0) {
            userRes = await pool.query(
                `INSERT INTO users (nom, email, password_hash, role, telephone, user_type) 
                 VALUES ($1, $2, $3, $4, $5, 'gestionnaire') RETURNING id`,
                ['Auto Manager', email, hashedPassword, 'gestionnaire', '+2299000AUTO']
            );
            console.log('✅ Created Auto Manager user.');
        } else {
             // Update password just in case
             await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hashedPassword, email]);
        }
        userId = userRes.rows[0].id;

        // 2. Create Building for this Manager
        const buildingRes = await pool.query(
            `INSERT INTO buildings (user_id, nom, type, adresse, ville) 
             VALUES ($1, 'Immeuble AutoTest', 'Immeuble', 'Cotonou', 'Cotonou') 
             RETURNING id`,
            [userId]
        );
        const buildingId = buildingRes.rows[0].id;

        // 3. Create Lots
        const lot1Res = await pool.query(
            `INSERT INTO lots (building_id, ref_lot, type, loyer_mensuel, statut) 
             VALUES ($1, 'AUTO-01', 'Appartement', 100000, 'occupe') RETURNING id`,
            [buildingId]
        );
        const lot2Res = await pool.query(
            `INSERT INTO lots (building_id, ref_lot, type, loyer_mensuel, statut) 
             VALUES ($1, 'AUTO-02', 'Studio', 80000, 'occupe') RETURNING id`,
            [buildingId]
        );
        const lot1 = lot1Res.rows[0].id;
        const lot2 = lot2Res.rows[0].id;

        // 4. Get a tenant (use existing or create one)
        let tenantRes = await pool.query("SELECT id FROM tenants LIMIT 1");
        if (tenantRes.rows.length === 0) {
             tenantRes = await pool.query("INSERT INTO tenants (nom, prenoms, telephone_principal) VALUES ('Tenant', 'Auto', '+2290000') RETURNING id");
        }
        const tenantId = tenantRes.rows[0].id;

        // 5. Clean up existing leases/payments for these specific lots to avoid duplicates
        // ... (Optional, but since we just created lots, they are empty)

        // 6. Create Lease 1: Expiring in 30 days (Trigger Expiration Alert)
        const dateDebut1 = format(subMonths(new Date(), 11), 'yyyy-MM-dd');
        const dateFin1 = format(addDays(new Date(), 30), 'yyyy-MM-dd'); 
        
        await pool.query(
            `INSERT INTO leases (lot_id, tenant_id, date_debut, date_fin, loyer_actuel, statut) 
             VALUES ($1, $2, $3, $4, 100000, 'actif')`,
            [lot1, tenantId, dateDebut1, dateFin1]
        );
        console.log('✅ Lease (Expiration Check) created for Auto Manager.');

        // 7. Create Lease 2: Active, No Payment for current month (Trigger Late Payment Alert)
        const dateDebut2 = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
        const dateFin2 = format(addDays(new Date(), 365), 'yyyy-MM-dd');
        
        await pool.query(
            `INSERT INTO leases (lot_id, tenant_id, date_debut, date_fin, loyer_actuel, statut) 
             VALUES ($1, $2, $3, $4, 80000, 'actif')`,
            [lot2, tenantId, dateDebut2, dateFin2]
        );
        console.log('✅ Lease (Late Payment Check) created for Auto Manager.');

        console.log(`✨ DONE! You can login as ${email} / ${password}`);
        
    } catch (error) {
        console.error('❌ Error testing data:', error);
    } finally {
        await pool.end();
    }
}

seedLeases();
