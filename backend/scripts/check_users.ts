import * as dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '../.env') });
import pool from '../db/database';

async function queryUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, nom, role FROM users LIMIT 15');
    console.log("Utilisateurs existants :");
    console.table(res.rows);

    // Mettre à jour john@hope.com (celui qu'on a créé) avec le bon mot de passe "Codeman2.0"
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Codeman2.0', salt);
    
    await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'john@hope.com']);
    console.log("Mot de passe mis à jour pour john@hope.com => Codeman2.0");

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

queryUsers();
