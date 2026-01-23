const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
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
