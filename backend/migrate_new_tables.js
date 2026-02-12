require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration(file) {
    const filePath = path.join(__dirname, 'migrations', file);
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`Executed: ${file}`);
    } catch (err) {
        if (err.code === 'ENOENT') {
             console.error(`Migration file not found: ${file}`);
        } else {
             console.error(`Error executing ${file}: ${err.message}`);
        }
    }
}

async function main() {
    await runMigration('add_geolocation_columns.sql');
    await runMigration('create_services_tables.sql');
    await runMigration('create_recovery_missions.sql');
    await pool.end();
}

if (require.main === module) {
    main().catch(err => console.error(err));
}
