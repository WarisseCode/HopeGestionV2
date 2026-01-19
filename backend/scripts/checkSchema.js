// Check payment_schedules schema
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkSchema() {
  const res = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'payment_schedules' ORDER BY ordinal_position
  `);
  console.log('Columns in payment_schedules:');
  res.rows.forEach(r => console.log('  -', r.column_name));
  await pool.end();
}

checkSchema();
