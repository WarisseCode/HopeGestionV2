const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const fs = require('fs');
const path = require('path');

async function findUserEmail() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, email, nom, role FROM users WHERE id = 86');
        const output = JSON.stringify(res.rows[0], null, 2);
        fs.writeFileSync(path.join(__dirname, 'user_email.log'), output);
        console.log(output);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

findUserEmail();
