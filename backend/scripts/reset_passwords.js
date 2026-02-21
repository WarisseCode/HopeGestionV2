const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function resetPasswords() {
    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash('password123', 10);
        
        // Reset User 77 (Landlord)
        await client.query('UPDATE users SET password_hash = $1 WHERE id = 77', [hash]);
        console.log('User 77 password reset to password123');
        
        // Reset User 86 (Tenant)
        await client.query('UPDATE users SET password_hash = $1 WHERE id = 86', [hash]);
        console.log('User 86 password reset to password123');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

resetPasswords();
