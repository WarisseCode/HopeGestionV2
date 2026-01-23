const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
});

const checkTables = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('--- TABLES ---');
    res.rows.forEach(r => console.log(r.table_name));
    
    // Check columns for 'depenses' if it exists
    if (res.rows.some(r => r.table_name === 'depenses')) {
        console.log('\n--- Columns of depenses ---');
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='depenses'");
        cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
    }
    
    // Check columns for 'payments'
     if (res.rows.some(r => r.table_name === 'payments')) {
        console.log('\n--- Columns of payments ---');
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='payments'");
        cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
    }

    client.release();
    await pool.end();
  } catch (err) {
    console.error(err);
  }
};

checkTables();
