import { Client } from 'pg';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function fixSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Add updated_at to buildings if it doesn't exist
    await client.query(`
      ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Colonne updated_at ajoutée à buildings');
    
    // Add updated_at to lots if it doesn't exist
    await client.query(`
      ALTER TABLE lots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Colonne updated_at ajoutée à lots');

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixSchema();
