const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hope_gestion_db',
  password: 'postgres123',
  port: 5432,
});

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('--- Starting Migration: Add photo_url ---');
    await client.query('BEGIN');

    // Add photo_url to buildings if not exists
    console.log('Checking buildings table for photo_url...');
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='buildings' AND column_name='photo_url') THEN 
          ALTER TABLE buildings ADD COLUMN photo_url TEXT; 
          RAISE NOTICE 'Added photo_url to buildings';
        ELSE
          RAISE NOTICE 'photo_url already exists in buildings';
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
