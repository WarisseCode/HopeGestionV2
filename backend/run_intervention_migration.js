const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hope_gestion',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'db/migrations/create_intervention_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running interventions migration...');
        await pool.query(sql);
        console.log('Migration successful: intervention tables created/updated.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
