
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const dbConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pool = new Pool(dbConfig);

async function runSingleMigration() {
    const client = await pool.connect();
    try {
        console.log('🔌 Connexion à la base de données pour migration ciblée...');
        
        const mobileMoneyPath = path.join(process.cwd(), 'migrations', '31_create_mobile_money_tables.sql');
        console.log('📄 Lecture du fichier:', mobileMoneyPath);
        
        if (fs.existsSync(mobileMoneyPath)) {
            const sql = fs.readFileSync(mobileMoneyPath, 'utf8');
            await client.query(sql);
            console.log('✅ Tables Mobile Money créées succès !');
        } else {
            console.error('❌ Fichier introuvable:', mobileMoneyPath);
        }

    } catch (error: any) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runSingleMigration();
