import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function checkPlans() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Lister les plans
    const plans = await client.query(`SELECT * FROM plans ORDER BY id ASC`);
    
    fs.writeFileSync('plans_result.txt', JSON.stringify(plans.rows, null, 2));
    console.log('Fichier écrit');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkPlans();
