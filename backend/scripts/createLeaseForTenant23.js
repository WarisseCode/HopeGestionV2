// backend/scripts/createLeaseForTenant23.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Charger .env
const result = dotenv.config();
if (result.error) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const dbConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pool = new Pool(dbConfig);

async function run() {
    const client = await pool.connect();
    try {
        const tenantId = 23; 
        console.log(`🔧 Creating data for Tenant ${tenantId}...`);

        // 1. Check if lease exists
        const leasesRes = await client.query('SELECT id FROM leases WHERE tenant_id = $1', [tenantId]);
        if (leasesRes.rows.length > 0) {
            console.log(`✅ Tenant ${tenantId} already has lease(s): ${leasesRes.rows.map(r => r.id).join(', ')}`);
            // Check for schedule
            const scheduleRes = await client.query('SELECT id FROM payment_schedules WHERE lease_id = $1 AND status=\'pending\'', [leasesRes.rows[0].id]);
            if (scheduleRes.rows.length === 0) {
                console.log('➕ Creating pending schedule...');
                await client.query(`
                    INSERT INTO payment_schedules (lease_id, total_amount, amount_paid, due_date, status, description)
                    VALUES ($1, 150000, 0, NOW(), 'pending', 'Loyer Test Final')
                `, [leasesRes.rows[0].id]);
                console.log('✅ Schedule created.');
            } else {
                 console.log('✅ Pending schedule already exists.');
            }
            return;
        }

        // 2. Find a lot
        const lotRes = await client.query('SELECT id, loyer_mensuel FROM lots LIMIT 1');
        if (lotRes.rows.length === 0) {
            console.error('❌ No lots found!');
            return;
        }
        const lot = lotRes.rows[0];

        // 3. Create active lease
        console.log('➕ Creating active lease...');
        const leaseRes = await client.query(`
            INSERT INTO leases (lot_id, tenant_id, date_debut, date_fin, loyer_actuel, statut)
            VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 year', $3, 'actif')
            RETURNING id
        `, [lot.id, tenantId, lot.loyer_mensuel]);
        
        const leaseId = leaseRes.rows[0].id;
        console.log(`✅ Created Lease ${leaseId}`);

        // 4. Create pending schedule
        console.log('➕ Creating pending schedule...');
        await client.query(`
            INSERT INTO payment_schedules (lease_id, total_amount, amount_paid, due_date, status, description)
            VALUES ($1, $2, 0, NOW(), 'pending', 'Loyer Test Final')
        `, [leaseId, lot.loyer_mensuel]);
        console.log('✅ Schedule created.');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
