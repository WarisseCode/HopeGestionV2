// @ts-nocheck
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const DB_CONFIG = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new Pool(DB_CONFIG);

async function fixOwnerLinks() {
    console.log('🔧 Fixing Owner-User Links...');

    try {
        // Get owner users and their corresponding owner entities
        const users = await pool.query(`
            SELECT u.id as user_id, u.email as user_email, o.id as owner_id
            FROM users u
            JOIN owners o ON u.email = o.email
            WHERE u.email IN ('owner@test.com', 'alien@test.com')
            AND u.role = 'proprietaire'
        `);

        console.log(`Found ${users.rows.length} owner users to link`);

        for (const row of users.rows) {
            // Check if link already exists
            const existing = await pool.query(`
                SELECT 1 FROM owner_user 
                WHERE user_id = $1 AND owner_id = $2
            `, [row.user_id, row.owner_id]);

            if (existing.rows.length > 0) {
                console.log(`✓ Link already exists for ${row.user_email}`);
                continue;
            }

            // Create the link
            await pool.query(`
                INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
                VALUES ($1, $2, 'owner', CURRENT_DATE, TRUE)
            `, [row.owner_id, row.user_id]);

            console.log(`✅ Created link for ${row.user_email} (user_id: ${row.user_id}, owner_id: ${row.owner_id})`);
        }

        console.log('\n🎉 Owner-User Links Fixed!');

    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixOwnerLinks().then(() => {
    console.log('Script finished.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
