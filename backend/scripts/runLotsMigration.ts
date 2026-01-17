// Quick script to run lots enhancement migration
import pool from '../db/database';
import fs from 'fs';
import path from 'path';

async function runLotsMigration() {
    const sqlPath = path.join(__dirname, '../db/migrations/migration_lots_enhancement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running lots enhancement migration...');
        await pool.query(sql);
        console.log('✅ Lots enhancement migration completed!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runLotsMigration();
