const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
});

const listTables = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
    client.release();
    await pool.end();
  } catch (err) {
    console.error(err);
  }
};

listTables();
