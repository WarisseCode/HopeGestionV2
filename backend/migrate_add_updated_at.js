const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hope_gestion_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('--- Starting Migration ---');
    await client.query('BEGIN');

    // Add updated_at to buildings if not exists
    console.log('Checking buildings table...');
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='buildings' AND column_name='updated_at') THEN 
          ALTER TABLE buildings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; 
          RAISE NOTICE 'Added updated_at to buildings';
        ELSE
          RAISE NOTICE 'updated_at already exists in buildings';
        END IF; 
      END $$;
    `);

    // Add updated_at to lots if not exists
    console.log('Checking lots table...');
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lots' AND column_name='updated_at') THEN 
          ALTER TABLE lots ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; 
          RAISE NOTICE 'Added updated_at to lots';
        ELSE
          RAISE NOTICE 'updated_at already exists in lots';
        END IF; 
      END $$;
    `);

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
