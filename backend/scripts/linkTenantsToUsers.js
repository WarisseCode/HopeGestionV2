// backend/scripts/linkTenantsToUsers.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
const result = dotenv.config();
if (result.error) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const dbConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pool = new Pool(dbConfig);

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔗 Linking Tenants to Users...');
        
        // 1. Add user_id column if not exists
        console.log('1. Migration: Adding user_id column to tenants table...');
        await client.query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            
            CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
        `);
        console.log('✅ Column added.');

        // 2. Link existing users
        console.log('2. Data Patch: Linking existing locataire users to tenants...');
        
        // Find users who are 'locataire'
        const usersRes = await client.query(`
            SELECT id, email, nom, role, user_type
            FROM users 
            WHERE user_type = 'locataire' OR role = 'locataire'
        `);

        console.log(`found ${usersRes.rows.length} locataire users.`);

        for (const user of usersRes.rows) {
            console.log(`   Processing User ${user.id} (${user.email})...`);
            
            // Try to find tenant by email
            const tenantRes = await client.query('SELECT id, nom, user_id FROM tenants WHERE email = $1', [user.email]);
            
            if (tenantRes.rows.length > 0) {
                const tenant = tenantRes.rows[0];
                if (tenant.user_id) {
                    console.log(`      ⚠️  Tenant ${tenant.id} already linked to User ${tenant.user_id}`);
                } else {
                    await client.query('UPDATE tenants SET user_id = $1 WHERE id = $2', [user.id, tenant.id]);
                    console.log(`      ✅ Linked User ${user.id} to Tenant ${tenant.id}`);
                }
            } else {
                console.log(`      ❌ No tenant found with email ${user.email}`);
                // Optional: try matching by phone if email fails? 
                // For now, let's keep it safe.
                
                // If this is User 79 (our test user), we should link them to the tenant we created earlier?
                // Or create a new tenant for them?
                
                // Let's create a tenant for them if none exists!
                console.log(`      ✨ Creating new tenant profile for User ${user.id}...`);
                const createRes = await client.query(`
                    INSERT INTO tenants (nom, prenoms, email, telephone_principal, user_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `, [user.nom || 'Inconnu', 'User', user.email, `+229${user.id}${Date.now().toString().slice(-4)}` /* Fake phone if needed */, user.id]);
                 console.log(`      ✅ Created and linked Tenant ${createRes.rows[0].id}`);
            }
        }
        
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
