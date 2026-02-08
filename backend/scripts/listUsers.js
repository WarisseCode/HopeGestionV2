
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

async function listUsers() {
    try {
        const res = await pool.query("SELECT id, nom, email, role, statut, created_at FROM users ORDER BY id DESC");
        console.table(res.rows);
    } catch (err) {
        if (err.code === '42703') { // Column not found
             console.log("Column missing, trying simpler query...");
             try {
                const res2 = await pool.query("SELECT id, nom, email, role, statut FROM users ORDER BY id DESC");
                console.table(res2.rows);
             } catch (e) { console.error(e); }
        } else {
            console.error('Error:', err);
        }
    } finally {
        await pool.end();
    }
}

listUsers();
