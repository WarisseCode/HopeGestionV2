// Quick script to run buildings enhancement migration
import pool from '../db/database';
import fs from 'fs';
import path from 'path';

async function runBuildingsMigration() {
    const sqlPath = path.join(__dirname, '../db/migrations/migration_buildings_enhancement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running buildings enhancement migration...');
        await pool.query(sql);
        console.log('✅ Buildings enhancement migration completed!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runBuildingsMigration();
