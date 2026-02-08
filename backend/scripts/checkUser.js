
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
        const fs = require('fs');
        const res = await pool.query("SELECT token FROM user_invitations WHERE email = 'derojou@gmail.com'");
        fs.writeFileSync('token.txt', res.rows[0].token);
        console.log('Token written to token.txt');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkUser();
