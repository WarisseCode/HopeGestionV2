import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
import pool from '../db/database';

async function fixJohn() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("Recherche de tous les john@hope.com...");
    const users = await client.query("SELECT id, email, nom, password_hash FROM users WHERE email ILIKE '%john@hope.com%'");
    console.log(`Trouvé ${users.rows.length} utilisateurs.`);

    let targetUserId = null;

    // Chercher le vrai "Codeman2.0"
    for (const u of users.rows) {
      const match = await bcrypt.compare('Codeman2.0', u.password_hash);
      if (match) {
        console.log(`✅ Vrai compte de l'utilisateur trouvé : ID ${u.id}`);
        targetUserId = u.id;
      } else {
        console.log(`❌ Mauvais compte (mot de passe différent) : ID ${u.id}`);
      }
    }

    if (!targetUserId) {
      console.log("Aucun compte avec le mot de passe Codeman2.0 n'a été trouvé !");
      return;
    }

    // Récupérer le(s) mauvais compte(s) créés par erreur (le script l'a créé hier/aujourd'hui)
    const badUsers = users.rows.filter(u => u.id !== targetUserId);

    for (const badUser of badUsers) {
      console.log(`Nettoyage des données pour le mauvais user ID ${badUser.id}...`);

      // 1. Récupérer les owners liés au mauvais user
      const ownerUserRows = await client.query('SELECT owner_id FROM owner_user WHERE user_id = $1', [badUser.id]);
      for (const row of ownerUserRows.rows) {
         const ownerId = row.owner_id;
         console.log(` - Nettoyage owner ID ${ownerId}...`);
         
         // Transférer les bâtiments à targetUserId -> Wait, on va juste transférer le owner_user vers le bon account.
         // Mais le owner a pu être créé avec le mauvais user !
         
         // Au lieu de supprimer le owner : on transfère simplement l'accès à TARGET_USER
         await client.query('UPDATE owner_user SET user_id = $1 WHERE user_id = $2 AND owner_id = $3', 
            [targetUserId, badUser.id, ownerId]);
         console.log(`   -> Bâtiments (et owner) transférés au vrai compte.`);
      }

      // Supprimer le mauvais utilisateur
      await client.query('DELETE FROM users WHERE id = $1', [badUser.id]);
      console.log(` - Mauvais utilisateur ID ${badUser.id} supprimé.`);
    }

    await client.query('COMMIT');
    console.log('✅ Opération de transfert terminée : tous les biens sont désormais liés au vrai compte.');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erreur:', e);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixJohn();
