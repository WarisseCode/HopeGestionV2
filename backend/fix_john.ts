import { Client } from 'pg';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function fixJohn() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Annuler l'abonnement pro (id 18)
    await client.query(`UPDATE subscriptions SET status = 'cancelled' WHERE id = 18`);
    console.log('Abonnement Pro annulé.');
    
    // S'assurer que le current_plan du user est bien 3 (Entreprise)
    await client.query(`UPDATE users SET current_plan_id = 3 WHERE email = 'john@hope.com'`);
    console.log('Profil mis à jour en Entreprise.');
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixJohn();
