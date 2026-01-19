// Run Module IV migration - Pure JS version
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME
});

const statements = [
    // Tenant profile fields
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS adresse_actuelle TEXT`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_expiration_piece DATE`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS photo_profil_url TEXT`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS photo_piece_url TEXT`,
    
    // Financial fields
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS caution NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS avance NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paiement_echelonne BOOLEAN DEFAULT FALSE`,
    
    // Tenant Access table
    `CREATE TABLE IF NOT EXISTS tenant_access (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
        is_active BOOLEAN DEFAULT FALSE,
        access_modules JSONB DEFAULT '{"contrat":true,"paiements":true,"plaintes":true,"services":false}',
        allow_online_payment BOOLEAN DEFAULT FALSE,
        notification_channel VARCHAR(20) DEFAULT 'whatsapp',
        access_code VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        channel VARCHAR(20) DEFAULT 'internal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_tenant_access_tenant ON tenant_access(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id)`
];

async function runMigration() {
    console.log('🔌 Connecting to database...');
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await pool.query(stmt);
            console.log(`✅ [${i + 1}/${statements.length}] Success`);
        } catch (error) {
            console.log(`⚠️ [${i + 1}/${statements.length}] Skipped (${error.code || error.message})`);
        }
    }
    
    console.log('✅ Migration completed!');
    await pool.end();
}

runMigration();
