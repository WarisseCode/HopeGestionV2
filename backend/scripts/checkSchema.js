// backend/scripts/checkSchema.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking tenants table columns...');
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tenants'
        `);
        console.log(res.rows.map(r => r.column_name));
        
        console.log('\n🔍 Checking users table columns...');
        const res2 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log(res2.rows.map(r => r.column_name));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
run();
