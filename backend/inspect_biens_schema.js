const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
});

const inspectColumns = async () => {
  try {
    const client = await pool.connect();
    
    const tables = ['buildings', 'lots'];
    
    for (const table of tables) {
      console.log(`\n--- Columns for ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      
      const columns = res.rows.map(r => r.column_name);
      console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));
      
      if (columns.includes('updated_at')) {
        console.log(`✅ updated_at exists in ${table}`);
      } else {
        console.log(`❌ updated_at MISSING in ${table}`);
      }

      if (columns.includes('photo_url')) {
        console.log(`✅ photo_url exists in ${table}`);
      } else {
        console.log(`❌ photo_url MISSING in ${table}`);
      }
    }
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error(err);
  }
};

inspectColumns();
