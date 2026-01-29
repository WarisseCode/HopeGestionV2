// @ts-nocheck
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432')
});

async function check() {
    try {
        console.log('=== USERS ===');
        const users = await pool.query(`
            SELECT id, email, role 
            FROM users 
            WHERE email IN ('owner@test.com', 'manager@test.com', 'alien@test.com')
        `);
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('\n=== OWNERS ===');
        const owners = await pool.query(`
            SELECT id, email 
            FROM owners 
            WHERE email IN ('owner@test.com', 'alien@test.com')
        `);
        console.log(JSON.stringify(owners.rows, null, 2));

        console.log('\n=== OWNER-USER LINKS ===');
        const links = await pool.query(`
            SELECT ou.*, u.email as user_email, o.email as owner_email
            FROM owner_user ou
            JOIN users u ON ou.user_id = u.id
            JOIN owners o ON ou.owner_id = o.id
            WHERE o.email IN ('owner@test.com', 'alien@test.com')
        `);
        console.log(JSON.stringify(links.rows, null, 2));

        console.log('\n=== BUILDINGS ===');
        const buildings = await pool.query(`
            SELECT b.id, b.nom, o.email as owner_email
            FROM buildings b
            JOIN owners o ON b.owner_id = o.id
            WHERE o.email IN ('owner@test.com', 'alien@test.com')
        `);
        console.log(JSON.stringify(buildings.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
