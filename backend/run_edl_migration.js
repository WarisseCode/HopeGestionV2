const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Config manuelle car nous sommes en script isolé
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
});

const runMigration = async () => {
  try {
    const sqlPath = path.join(__dirname, 'db', 'migrations', 'create_edl_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Running migration...');
    await client.query(sql);
    
    console.log('Migration completed successfully!');
    client.release();
    await pool.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
