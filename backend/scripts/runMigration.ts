// backend/scripts/runMigration.ts
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔌 Connexion à la base de données...');
        
        // Lire les fichiers SQL
        // Lire les fichiers SQL - Utilisation de process.cwd() pour être robuste (source vs dist)
        const dbDir = path.join(process.cwd(), 'db');
        const migrationPath = path.join(dbDir, 'migration_multi_owner.sql');
        const userTypeMigrationPath = path.join(dbDir, 'migration_user_type.sql');
        const documentsMigrationPath = path.join(dbDir, 'migration_documents.sql');
        const tenantsEnhancementPath = path.join(dbDir, 'migration_tenants_enhancement.sql');
        const calendarSupportPath = path.join(dbDir, 'migration_calendar_support.sql');
        const auditLogsPath = path.join(dbDir, 'migration_audit_logs.sql');
        
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const userTypeSql = fs.readFileSync(userTypeMigrationPath, 'utf8');
        const documentsSql = fs.readFileSync(documentsMigrationPath, 'utf8');
        const tenantsSql = fs.readFileSync(tenantsEnhancementPath, 'utf8');
        const calendarSql = fs.readFileSync(calendarSupportPath, 'utf8');
        const auditSql = fs.readFileSync(auditLogsPath, 'utf8');
        
        console.log('📄 Fichier SQL chargé:', migrationPath);
        console.log('🚀 Exécution de la migration...\n');
        
        const fixAuditIdsPath = path.join(dbDir, 'fix_audit_logs_ids.sql');
        const fixAuditIdsSql = fs.readFileSync(fixAuditIdsPath, 'utf8');

        // Exécuter les migrations - Ordre séquentiel
        console.log('1/8 Exécution migration_multi_owner...');
        await client.query(sql);
        console.log('2/8 Exécution migration_user_type...');
        await client.query(userTypeSql);
        console.log('3/8 Exécution migration_documents...');
        await client.query(documentsSql);
        console.log('4/8 Exécution migration_tenants_enhancement...');
        await client.query(tenantsSql);
        console.log('5/8 Exécution migration_calendar_support...');
        await client.query(calendarSql);
        console.log('6/8 Exécution migration_audit_logs...');
        await client.query(auditSql);
        // await client.query(fixAuditSql); // Fichier manquant ou déjà intégré ?
        // await client.query(fixAuditSchemaV2Sql); // Fichier manquant ou déjà intégré ?
        console.log('7/8 Exécution fix_audit_logs_ids...');
        await client.query(fixAuditIdsSql);
        
        console.log('✅ Migration exécutée avec succès!');
        console.log('\n📊 Tables créées et mises à jour.');
        console.log('\n🔧 Modifications appliquées:');
        console.log('   - users (ajout: agency_id, role, is_super_admin)');
        console.log('   - biens (ajout: owner_id)');
        console.log('   - lots (ajout: owner_id)');
        console.log('   - locataires (ajout: owner_id)');
        console.log('   - contrats (ajout: owner_id)');
        console.log('   - paiements (ajout: owner_id)');
        console.log('\n📈 Vues créées:');
        console.log('   - v_owners_summary');
        console.log('   - v_user_owners');
        console.log('\n🎯 Données de démonstration insérées:');
        console.log('   - 3 propriétaires exemples');
        
        console.log('\n🔧 Migration user_type terminée.');
        console.log('\n📁 Migration Documents terminée.');
        console.log('\n👥 Migration Locataires (Amélioration) terminée.');
        console.log('\n📅 Migration Calendrier terminée.');
        
    } catch (error: any) {
        console.error('❌ Erreur lors de la migration:', error.message);
        console.error('\n📝 Détails:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la migration
runMigration()
    .then(() => {
        console.log('\n✨ Migration terminée avec succès!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    });
