
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function debug() {
    try {
        console.log('--- DEBUG USER ROLE ---');
        const userRes = await pool.query(`SELECT id, email, role, user_type FROM users WHERE email = 'ayinla@gmail.com'`);
        if (userRes.rows.length === 0) {
            console.log('User ayinla@gmail.com NOT FOUND locally.');
        } else {
            console.log('User Found:', userRes.rows[0]);
            const userId = userRes.rows[0].id;
            
            console.log('\n--- DEBUG OWNER ACCESS ---');
            const accessRes = await pool.query(`SELECT * FROM owner_user WHERE user_id = $1`, [userId]);
            console.log(`Found ${accessRes.rows.length} owner_user links.`);
            accessRes.rows.forEach(row => {
                console.log(`- OwnerID: ${row.owner_id}, Role: ${row.role}, Active: ${row.is_active}`);
            });
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
