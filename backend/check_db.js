
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function check() {
  try {
    const res = await pool.query("SELECT id, name, phone, email FROM owners WHERE phone LIKE '%5471370%';");
    console.log('Owners found:', res.rows);
    
    const all = await pool.query("SELECT id, name, phone FROM owners ORDER BY created_at DESC LIMIT 5;");
    console.log('Recent owners:', all.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
