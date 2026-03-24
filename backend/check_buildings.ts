import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function checkBuildingsTable() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Obtenir le schéma de la table buildings
    const schema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'buildings'
    `);
    
    fs.writeFileSync('buildings_schema.txt', JSON.stringify(schema.rows, null, 2));
    console.log('Schéma écrit');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkBuildingsTable();
