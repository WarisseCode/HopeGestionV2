const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the backend .env file
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // Don't log password

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hopegestion',
  password: process.env.DB_PASSWORD || 'Olya199800', // Hardcoded as fallback based on previous context if needed, but risky. Let's try to load env properly first.
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 07_guest_access.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'backend', 'migrations', '07_guest_access.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
