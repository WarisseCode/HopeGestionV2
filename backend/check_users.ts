import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function checkUsers() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Lister l'utilisateur john et ses plans
    const users = await client.query(`
      SELECT u.id, u.nom, u.email, u.role, u.current_plan_id,
             (SELECT count(*) FROM subscriptions WHERE user_id = u.id AND status='active') as active_subs,
             (SELECT p.name FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = u.id AND s.status='active' ORDER BY s.created_at DESC LIMIT 1) as plan_from_limits,
             (SELECT p.name FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = u.id AND s.status='active' ORDER BY s.end_date DESC NULLS FIRST LIMIT 1) as plan_from_status
      FROM users u
      WHERE u.email = 'john@hope.com'
    `);
    
    fs.writeFileSync('users_result.txt', JSON.stringify(users.rows, null, 2));
    console.log('Fichier écrit');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkUsers();
