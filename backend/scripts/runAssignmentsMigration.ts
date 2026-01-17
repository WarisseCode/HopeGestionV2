// Quick script to run assignments migration
import pool from '../db/database';
import fs from 'fs';
import path from 'path';

async function runAssignmentsMigration() {
    const sqlPath = path.join(__dirname, '../db/migrations/migration_assignments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running assignments migration...');
        await pool.query(sql);
        console.log('✅ Assignments migration completed!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runAssignmentsMigration();
