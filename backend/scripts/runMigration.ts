import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement seulement en local
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const dbConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Always required for Render/Cloud DBs
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

console.log('🔧 DB Config:', process.env.DATABASE_URL ? 'Using DATABASE_URL' : 'Using individual params');
if (!process.env.DATABASE_URL) {
    console.log('   Host:', process.env.DB_HOST);
    console.log('   User:', process.env.DB_USER);
    console.log('   DB:', process.env.DB_NAME);
}

const pool = new Pool(dbConfig);

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔌 Connexion à la base de données...');
        
        // Lire les fichiers SQL
        // Lire les fichiers SQL - Utilisation de process.cwd() pour être robuste (source vs dist)
        const dbDir = path.join(process.cwd(), 'db');
        const initPath = path.join(dbDir, 'init.sql');
        const migrationPath = path.join(dbDir, 'migration_multi_owner.sql');
        const userTypeMigrationPath = path.join(dbDir, 'migration_user_type.sql');
        const documentsMigrationPath = path.join(dbDir, 'migration_documents.sql');
        const tenantsEnhancementPath = path.join(dbDir, 'migration_tenants_enhancement.sql');
        const calendarSupportPath = path.join(dbDir, 'migration_calendar_support.sql');

        const auditLogsPath = path.join(dbDir, 'migration_audit_logs.sql');
        const financeMigrationPath = path.join(dbDir, 'migration_finance.sql');
        
        const initSql = fs.readFileSync(initPath, 'utf8');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const userTypeSql = fs.readFileSync(userTypeMigrationPath, 'utf8');
        const documentsSql = fs.readFileSync(documentsMigrationPath, 'utf8');
        const tenantsSql = fs.readFileSync(tenantsEnhancementPath, 'utf8');
        const calendarSql = fs.readFileSync(calendarSupportPath, 'utf8');
        // const auditSql = fs.readFileSync(auditLogsPath, 'utf8'); // Commented in original
        const financeSql = fs.readFileSync(financeMigrationPath, 'utf8');
        
        console.log('📄 Fichier SQL chargé:', migrationPath);
        console.log('🚀 Exécution de la migration...\n');
        
        // const fixAuditIdsPath = path.join(dbDir, 'fix_audit_logs_ids.sql');
        // const fixAuditIdsSql = fs.readFileSync(fixAuditIdsPath, 'utf8');

        // Exécuter les migrations - Ordre séquentiel
        console.log('0/9 Exécution init.sql (tables de base)...');
        await client.query(initSql);
        console.log('1/9 Exécution migration_multi_owner...');
        await client.query(sql);
        console.log('2/9 Exécution migration_user_type...');
        await client.query(userTypeSql);
        console.log('3/9 Exécution migration_documents...');
        await client.query(documentsSql);
        console.log('4/9 Exécution migration_tenants_enhancement...');
        await client.query(tenantsSql);
        console.log('5/9 Exécution migration_calendar_support...');
        await client.query(calendarSql);

        console.log('8/9 Exécution migration_finance...');
        const notifPath = path.join(dbDir, 'migration_notifications.sql');
        const notifSql = fs.readFileSync(notifPath, 'utf8');

        await client.query(financeSql);
        console.log('9/9 Exécution migration_notifications...');
        await client.query(notifSql);

        console.log('10/10 Exécution migration_contracts...');
        const contractsPath = path.join(dbDir, 'migration_contracts.sql');
        const contractsSql = fs.readFileSync(contractsPath, 'utf8');
        await client.query(contractsSql);

        console.log('11/11 Exécution migration_buildings_enhancement...');
        const buildingsEnhancementPath = path.join(dbDir, 'migrations', 'migration_buildings_enhancement.sql');
        if (fs.existsSync(buildingsEnhancementPath)) {
            const buildingsEnhancementSql = fs.readFileSync(buildingsEnhancementPath, 'utf8');
            await client.query(buildingsEnhancementSql);
            console.log('   - buildings (ajout: GPS, photos, gestionnaire, quartier)');
        }

        console.log('12/12 Exécution migrations/12_create_subscriptions...');
        const subscriptionsPath = path.join(process.cwd(), 'migrations', '12_create_subscriptions.sql');
        if (fs.existsSync(subscriptionsPath)) {
            const subscriptionsSql = fs.readFileSync(subscriptionsPath, 'utf8');
            await client.query(subscriptionsSql);
            console.log('   - plans, subscriptions, subscription_payments créées');
        }

        console.log('13/13 Exécution migrations/20_fix_leases_complete...');
        const leasesFixPath = path.join(process.cwd(), 'migrations', '20_fix_leases_complete.sql');
        if (fs.existsSync(leasesFixPath)) {
            const leasesFixSql = fs.readFileSync(leasesFixPath, 'utf8');
            await client.query(leasesFixSql);
            console.log('   - leases (ajout: owner_id, type_contrat, prix_vente, etc.)');
        }

        console.log('14/14 Exécution migrations/21_fix_lots_complete...');
        const lotsFixPath = path.join(process.cwd(), 'migrations', '21_fix_lots_complete.sql');
        if (fs.existsSync(lotsFixPath)) {
            const lotsFixSql = fs.readFileSync(lotsFixPath, 'utf8');
            await client.query(lotsFixSql);
            console.log('   - lots (ajout: bloc, caution, prix_vente, etc.)');
        }

        console.log('15/15 Exécution migrations/22_fix_payments_complete...');
        const paymentsFixPath = path.join(process.cwd(), 'migrations', '22_fix_payments_complete.sql');
        if (fs.existsSync(paymentsFixPath)) {
            const paymentsFixSql = fs.readFileSync(paymentsFixPath, 'utf8');
            await client.query(paymentsFixSql);
            console.log('   - payments (ajout: schedule_id, description, owner_id)');
        }

        console.log('16/16 Exécution migrations/23_fix_owners_metadata...');
        const ownersFixPath = path.join(process.cwd(), 'migrations', '23_fix_owners_metadata.sql');
        if (fs.existsSync(ownersFixPath)) {
            const ownersFixSql = fs.readFileSync(ownersFixPath, 'utf8');
            await client.query(ownersFixSql);
            console.log('   - owners (ajout: company_name, rccm_number, mobile_money_coordinates)');
        }

        // --- NOUVELLES MIGRATIONS ---
        console.log('17/17 Exécution migrations/add_geolocation_columns...');
        const geoPath = path.join(process.cwd(), 'migrations', 'add_geolocation_columns.sql');
        if (fs.existsSync(geoPath)) {
            const geoSql = fs.readFileSync(geoPath, 'utf8');
            await client.query(geoSql);
            console.log('   - Geolocation columns added');
        }

        console.log('18/18 Exécution migrations/create_services_tables...');
        const servicesPath = path.join(process.cwd(), 'migrations', 'create_services_tables.sql');
        if (fs.existsSync(servicesPath)) {
            const servicesSql = fs.readFileSync(servicesPath, 'utf8');
            await client.query(servicesSql);
            console.log('   - Services tables created');
        }

        console.log('19/19 Exécution migrations/create_recovery_missions...');
        const recoveryPath = path.join(process.cwd(), 'migrations', 'create_recovery_missions.sql');
        if (fs.existsSync(recoveryPath)) {
            const recoverySql = fs.readFileSync(recoveryPath, 'utf8');
            await client.query(recoverySql);
            console.log('   - Recovery missions table created');
        }
        
        console.log('✅ Migration exécutée avec succès!');
        console.log('\n📊 Tables créées et mises à jour.');
        
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
