// backend/scripts/updateTenantPhone.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
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
        console.log('📱 Updating Tenant 23 Phone Number...');
        await client.query("UPDATE tenants SET telephone_principal = '97000000' WHERE id = 23");
        console.log('✅ Phone number updated to 97000000');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
