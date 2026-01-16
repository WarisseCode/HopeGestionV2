import pool from '../db/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    const sqlPath = path.join(__dirname, '../db/migrations/create_admin_invitations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running migration: create_admin_invitations.sql');
        await pool.query(sql);
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
