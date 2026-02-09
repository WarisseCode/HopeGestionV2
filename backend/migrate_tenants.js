const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config(); 

console.log('=== Migration 25: Fix Tenants Schema ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hopegestion',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 25_fix_tenants_schema.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '25_fix_tenants_schema.sql'), 'utf8');
    const result = await client.query(sql);
    console.log('✅ Migration completed successfully!');
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
