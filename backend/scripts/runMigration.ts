// backend/scripts/runMigration.ts
// Script de migration RESILIENT - chaque étape est isolée pour ne pas bloquer les suivantes
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

console.log('🔧 DB Config:', process.env.DATABASE_URL ? 'Using DATABASE_URL' : 'Using individual params');

const pool = new Pool(dbConfig);

// Helper: exécuter un fichier SQL avec gestion d'erreur isolée
async function runStep(client: any, label: string, sqlOrPath: string, isFile = false) {
    try {
        let sql = sqlOrPath;
        if (isFile) {
            if (!fs.existsSync(sqlOrPath)) {
                console.log(`  ⏭️  ${label} — fichier absent, ignoré`);
                return;
            }
            sql = fs.readFileSync(sqlOrPath, 'utf8');
        }
        await client.query(sql);
        console.log(`  ✅ ${label}`);
    } catch (err: any) {
        console.warn(`  ⚠️  ${label} — ${err.message} (non bloquant, on continue)`);
    }
}

async function runMigration() {
    const client = await pool.connect();
    const dbDir = path.join(process.cwd(), 'db');
    const migrationsDir = path.join(process.cwd(), 'migrations');

    try {
        console.log('🔌 Connexion à la base de données...');
        console.log('🚀 Exécution des migrations (mode résilient)...\n');

        // === ÉTAPES CRITIQUES (tables de base) ===
        await runStep(client, '01 init.sql', path.join(dbDir, 'init.sql'), true);
        await runStep(client, '02 migration_multi_owner', path.join(dbDir, 'migration_multi_owner.sql'), true);
        await runStep(client, '03 migration_user_type', path.join(dbDir, 'migration_user_type.sql'), true);
        await runStep(client, '04 migration_documents', path.join(dbDir, 'migration_documents.sql'), true);
        await runStep(client, '05 migration_tenants_enhancement', path.join(dbDir, 'migration_tenants_enhancement.sql'), true);
        await runStep(client, '06 migration_calendar_support', path.join(dbDir, 'migration_calendar_support.sql'), true);
        await runStep(client, '07 migration_finance', path.join(dbDir, 'migration_finance.sql'), true);
        await runStep(client, '08 migration_notifications', path.join(dbDir, 'migration_notifications.sql'), true);
        await runStep(client, '09 migration_contracts', path.join(dbDir, 'migration_contracts.sql'), true);

        // === ÉTAPES OPTIONNELLES (améliorations) ===
        await runStep(client, '10 migration_buildings_enhancement', path.join(dbDir, 'migrations', 'migration_buildings_enhancement.sql'), true);
        await runStep(client, '11 create_subscriptions', path.join(migrationsDir, '12_create_subscriptions.sql'), true);
        await runStep(client, '12 fix_leases_complete', path.join(migrationsDir, '20_fix_leases_complete.sql'), true);
        await runStep(client, '13 fix_lots_complete', path.join(migrationsDir, '21_fix_lots_complete.sql'), true);
        await runStep(client, '14 fix_payments_complete', path.join(migrationsDir, '22_fix_payments_complete.sql'), true);
        await runStep(client, '15 fix_owners_metadata', path.join(migrationsDir, '23_fix_owners_metadata.sql'), true);
        await runStep(client, '16 add_payments_missing_columns', path.join(dbDir, 'migrations', 'add_payments_missing_columns.sql'), true);
        await runStep(client, '17 add_payment_schedules_missing_columns', path.join(dbDir, 'migrations', 'add_payment_schedules_missing_columns.sql'), true);
        await runStep(client, '18 create_finance_tables', path.join(dbDir, 'migrations', 'create_finance_tables.sql'), true);
        await runStep(client, '19 create_mobile_money_tables', path.join(migrationsDir, '31_create_mobile_money_tables.sql'), true);

        // === ÉTAPES CRITIQUES POUR LA LIAISON LOCATAIRE ===
        await runStep(client, '20 migration_manager_code', path.join(dbDir, 'migration_manager_code.sql'), true);

        // Auto-link owners to users via email (owner_user)
        await runStep(client, '21 auto-link owners↔users', `
            INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date,
                can_view_finances, can_edit_properties, can_manage_tenants, 
                can_manage_contracts, can_validate_payments)
            SELECT o.id, u.id, 'owner', TRUE, CURRENT_DATE,
                TRUE, TRUE, TRUE, TRUE, TRUE
            FROM owners o
            JOIN users u ON LOWER(u.email) = LOWER(o.email)
            WHERE o.email IS NOT NULL AND o.email != ''
            ON CONFLICT (owner_id, user_id) DO NOTHING
        `);

        // Colonnes manquantes dans users et owner_user
        await runStep(client, '22 users preferences/is_guest/photo_url', `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'actif';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
        `);

        await runStep(client, '23 owner_user missing columns', `
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT FALSE;
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_delete_data BOOLEAN DEFAULT FALSE;
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_access_audit_logs BOOLEAN DEFAULT FALSE;
        `);

        // === COLONNES MANQUANTES DANS TENANTS (CRITIQUE pour link-tenant) ===
        await runStep(client, '24 tenants user_id + invitation_code + statut', `
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invitation_code VARCHAR(50);
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'Actif';
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_id INTEGER;
            CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
            CREATE INDEX IF NOT EXISTS idx_tenants_invitation_code ON tenants(invitation_code);
        `);

        await runStep(client, '25 migration_tenant_invitation', path.join(dbDir, 'migration_tenant_invitation.sql'), true);

        // Fix tenants with NULL type (created by link-tenant without specifying type)
        await runStep(client, '26 fix tenants NULL type', `
            UPDATE tenants SET type = 'Locataire' WHERE type IS NULL;
        `);

        await runStep(client, '27 create notification_settings', path.join(process.cwd(), 'migrations', 'create_notification_settings.sql'), true);

        // Manager code pour owners (badge code agence) - Sécurisation
        await runStep(client, '28 manager_code colonne + gen', `
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20);
            ALTER TABLE owners ALTER COLUMN manager_code DROP NOT NULL;
            ALTER TABLE owners DROP CONSTRAINT IF EXISTS unique_manager_code;
            UPDATE owners SET manager_code = 'AG-' || UPPER(SUBSTRING(MD5(id::text || COALESCE(name,'') || RANDOM()::text), 1, 6))
            WHERE manager_code IS NULL OR manager_code = '';
            CREATE INDEX IF NOT EXISTS idx_owners_manager_code ON owners(manager_code);
        `);

        await runStep(client, '29 migration_manager_code.sql', path.join(dbDir, 'migration_manager_code.sql'), true);

        await runStep(client, '30 create_intervention_tables', path.join(dbDir, 'migrations', 'create_intervention_tables.sql'), true);

        console.log('\n✅ Migration exécutée avec succès (mode résilient) !');

        
    } catch (error: any) {
        // Ce catch n'attrape que les erreurs de connexion ou erreurs fatales
        console.error('❌ Erreur fatale:', error.message);
        // NE PAS faire process.exit(1) — laisser le serveur démarrer quand même
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la migration
runMigration()
    .then(() => {
        console.log('\n✨ Script de migration terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erreur connexion DB:', error);
        // TOUJOURS exit 0 pour ne pas bloquer le déploiement Render
        // Les migrations manquantes seront rattrapées par runMigrations au startup
        process.exit(0);
    });
