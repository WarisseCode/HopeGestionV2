import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function checkSubscriptions() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Trouver le user_id de john
    const userRes = await client.query("SELECT id FROM users WHERE email = 'john@hope.com' LIMIT 1");
    if (userRes.rows.length === 0) throw new Error('John non trouvé');
    const userId = userRes.rows[0].id;
    
    // Lister ses abonnements
    const subs = await client.query(`
      SELECT s.id, s.status, p.name as plan_name, s.start_date, s.end_date, s.created_at
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);
    
    fs.writeFileSync('subs_result.txt', JSON.stringify(subs.rows, null, 2));
    console.log('Fichier écrit');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSubscriptions();
