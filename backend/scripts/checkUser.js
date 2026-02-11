
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hope_gestion_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function checkUser() {
    try {
        const res = await pool.query("SELECT token FROM user_invitations WHERE email = 'derojou@gmail.com'");
        if (res.rows.length > 0) {
            console.log('Token:', res.rows[0].token);
        } else {
            console.log('No token found');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkUser();
