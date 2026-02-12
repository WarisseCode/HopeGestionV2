const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
// Load environment variables from backend/.env
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') }); 

console.log('=== Inspecting Payments Table Schema ===');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hopegestion',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function inspectSchema() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'leases'
        ORDER BY column_name;
    `);
    
    console.log('Columns in "leases" table:');
    if (res.rows.length === 0) {
        console.log('Table "leases" does not exist!');
    } else {
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    }

  } catch (err) {
    console.error('❌ Error inspecting schema:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

inspectSchema();
