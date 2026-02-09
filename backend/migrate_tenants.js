const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables correcty from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== Migration 27: Reconcile Payments Schema ===');

// Use DATABASE_URL (Render standard) or fallback to individual vars
const connectionConfig = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'hopegestion',
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

console.log('Using DATABASE_URL:', !!process.env.DATABASE_URL);
const pool = new Pool(connectionConfig);

async function runMigration() {
  const client = await pool.connect();
  try {
    // Run migration 27 for payments reconciliation
    console.log('Running migration 27_reconcile_payments_schema.sql...');
    const migrationPath = path.join(__dirname, 'migrations', '27_reconcile_payments_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons properly or run as one block since it's a DO block
    const result = await client.query(sql);
    
    console.log('✅ Migration 27 completed successfully!');
    console.log('Result:', result);
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
