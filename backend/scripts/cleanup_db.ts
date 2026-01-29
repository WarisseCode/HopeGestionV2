
import pool from '../db/database';
import * as dotenv from 'dotenv';

dotenv.config();

const EXCLUDE_FROM_TRUNCATE = [
    'users', 
    'permission_matrix', 
    'roles', 
    'permissions', 
    'role_permissions', 
    'plans',
    'migrations' // if exists (e.g. knex_migrations)
];

async function cleanupDatabase() {
    const client = await pool.connect();
    try {
        console.log('🧹 Starting Database Cleanup...');

        // 1. Fetch all tables
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        const allTables = res.rows.map(r => r.table_name);
        const tablesToTruncate = allTables.filter(t => !EXCLUDE_FROM_TRUNCATE.includes(t));

        console.log(`Found ${allTables.length} tables.`);
        console.log(`Truncating ${tablesToTruncate.length} tables...`);

        // 2. Truncate tables with CASCADE
        for (const table of tablesToTruncate) {
            try {
                // Use quotes to handle case sensitivity or keywords
                await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
                console.log(`✅ Truncated: ${table}`);
            } catch (err) {
                console.error(`❌ Failed to truncate ${table}:`, err);
            }
        }

        // 3. Clean Users table
        // Keep ONLY admin users (or specific super admin)
        // We'll trust role='admin' for now, or we can check for specific email if needed.
        console.log('🧹 Cleaning Users table...');
        
        // Count before
        const countBefore = await client.query('SELECT COUNT(*) FROM users');
        
        // Delete non-admins
        const deleteRes = await client.query(`
            DELETE FROM users 
            WHERE role != 'admin'
        `);
        
        // Count after
        const countAfter = await client.query('SELECT COUNT(*) FROM users');
        
        console.log(`✅ Users cleaned. Deleted: ${deleteRes.rowCount}. Remaining: ${countAfter.rows[0].count} (Admins only)`);

        console.log('🎉 Database cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupDatabase();
