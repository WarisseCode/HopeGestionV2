const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'owners'
      ORDER BY ordinal_position;
    `);
    console.log('=== ALL COLUMNS IN owners TABLE ===');
    for (const row of res.rows) {
      console.log(`  ${row.column_name} (${row.data_type}${row.character_maximum_length ? ', max: ' + row.character_maximum_length : ''})`);
    }
    console.log(`\nTotal columns: ${res.rows.length}`);
    
    // Check specifically for the columns we use in UPDATE
    const checkCols = ['phone_secondary', 'secondary_phone', 'mobile_money_number', 'mobile_money_coordinates', 'id_number', 'photo_url', 'rccm_number', 'first_name'];
    console.log('\n=== COLUMN EXISTENCE CHECK ===');
    const colNames = res.rows.map(r => r.column_name);
    for (const col of checkCols) {
      console.log(`  ${col}: ${colNames.includes(col) ? '✅ EXISTS' : '❌ MISSING'}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
