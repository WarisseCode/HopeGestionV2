// script_migration_otp.ts
import pool from './db/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'db', 'migration_email_verification.sql'), 'utf-8');
        console.log('Connexion à la BDD...');
        await pool.query(sql);
        console.log('✅ Migration SQL appliquée avec succès !');
    } catch (error) {
        console.error('Erreur lors de la migration:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

runMigration();
