const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// We are in backend/ directory
dotenv.config(); 

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hopegestion',
  password: process.env.DB_PASSWORD, // Should be loaded from .env
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 07_guest_access.sql...');
    // Path is relative to backend/ (cwd)
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '07_guest_access.sql'), 'utf8');
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
