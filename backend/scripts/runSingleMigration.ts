// backend/scripts/runSingleMigration.ts
// Usage: npx ts-node scripts/runSingleMigration.ts migrations/12_create_subscriptions.sql
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function runSingleMigration() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('❌ Usage: npx ts-node scripts/runSingleMigration.ts <path/to/migration.sql>');
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Fichier non trouvé: ${fullPath}`);
        process.exit(1);
    }

    const client = await pool.connect();
    try {
        console.log(`🔌 Connexion à la base de données...`);
        console.log(`📄 Exécution de: ${fullPath}`);
        
        const sql = fs.readFileSync(fullPath, 'utf8');
        await client.query(sql);
        
        console.log('✅ Migration exécutée avec succès!');
    } catch (error: any) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runSingleMigration();
