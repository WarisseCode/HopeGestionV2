const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Config utilisant les variables d'environnement
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hope_gestion_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
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
