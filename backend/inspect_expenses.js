const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hope_gestion_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const checkExpenses = async () => {
  try {
    const client = await pool.connect();
    console.log('\n--- Columns of expenses ---');
    const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='expenses'");
    cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
    client.release();
    await pool.end();
  } catch (err) {
    console.error(err);
  }
};

checkExpenses();
