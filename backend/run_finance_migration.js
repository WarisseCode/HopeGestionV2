const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hope_gestion_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const runMigration = async () => {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        
        console.log('Reading migration file...');
        const sqlPath = path.join(__dirname, 'db', 'migrations', 'create_finance_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing migration...');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('Migration successful!');
        client.release();
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

runMigration();
