// backend/scripts/migrateRentPayments.js
// Script pour exécuter les migrations de paiement de loyer en ligne

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('📦 Migration: Tables de paiement en ligne (FedaPay)');
        console.log('🔌 Connexion à la base de données...\n');
        
        // Migration 28: Create rent_payment_transactions table
        console.log('1/2 Création table rent_payment_transactions...');
        const migration28Path = path.join(__dirname, '../migrations/28_create_rent_payment_transactions.sql');
        const migration28Sql = fs.readFileSync(migration28Path, 'utf8');
        await client.query(migration28Sql);
        console.log('✅ Table rent_payment_transactions créée\n');
        
        // Migration 29: Add quittance_url to payments
        console.log('2/2 Ajout colonne quittance_url à payments...');
        const migration29Path = path.join(__dirname, '../migrations/29_add_quittance_url.sql');
        const migration29Sql = fs.readFileSync(migration29Path, 'utf8');
        await client.query(migration29Sql);
        console.log('✅ Colonne quittance_url ajoutée\n');
        
        console.log('🎉 Migrations exécutées avec succès!');
        console.log('\n📊 Tables créées:');
        console.log('   ✓ rent_payment_transactions');
        console.log('   ✓ payments.quittance_url (colonne)');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate()
    .then(() => {
        console.log('\n✨ Migration terminée!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    });
