// backend/scripts/runMigrations.ts
// Ce script s'exécute AUTOMATIQUEMENT au démarrage du backend (index.ts).
// Chaque migration est idempotente : peut tourner plusieurs fois sans erreur.
// Les migrations déjà exécutées sont tracées dans la table `migrations_log`.

import pool from '../db/database';

interface Migration {
    name: string;
    sql: string;
}

// ============================================================
// LISTE DES MIGRATIONS (ordre important : dépendances d'abord)
// Toutes les requêtes SQL doivent être idempotentes (IF NOT EXISTS, ON CONFLICT, etc.)
// ============================================================
const MIGRATIONS: Migration[] = [
    {
        name: '001_manager_code_column',
        sql: `
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20);
            -- Contrainte d'unicité (ignore si déjà existante)
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'unique_manager_code'
                ) THEN
                    ALTER TABLE owners ADD CONSTRAINT unique_manager_code UNIQUE (manager_code);
                END IF;
            END $$;
            CREATE INDEX IF NOT EXISTS idx_owners_manager_code ON owners(manager_code);
        `
    },
    {
        name: '002_generate_missing_manager_codes',
        sql: `
            -- Générer un code AG-XXXXXX pour chaque owner sans code
            UPDATE owners 
            SET manager_code = 'AG-' || UPPER(SUBSTRING(MD5(id::text || name || EXTRACT(EPOCH FROM NOW())::text), 1, 6))
            WHERE manager_code IS NULL OR manager_code = '';
        `
    },
    {
        name: '003_manager_code_not_null',
        sql: `
            -- Ne rendre NOT NULL que si tous les owners ont un code (évite erreur si table vide)
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM owners WHERE manager_code IS NULL) THEN
                    BEGIN
                        ALTER TABLE owners ALTER COLUMN manager_code SET NOT NULL;
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'manager_code already NOT NULL or error: %', SQLERRM;
                    END;
                END IF;
            END $$;
        `
    },
    {
        name: '004_owner_user_table',
        sql: `
            CREATE TABLE IF NOT EXISTS owner_user (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'manager',
                is_active BOOLEAN DEFAULT TRUE,
                start_date DATE DEFAULT CURRENT_DATE,
                can_view_finances BOOLEAN DEFAULT TRUE,
                can_edit_properties BOOLEAN DEFAULT TRUE,
                can_manage_tenants BOOLEAN DEFAULT TRUE,
                can_manage_contracts BOOLEAN DEFAULT TRUE,
                can_validate_payments BOOLEAN DEFAULT FALSE,
                can_manage_users BOOLEAN DEFAULT FALSE,
                can_delete_data BOOLEAN DEFAULT FALSE,
                can_access_audit_logs BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(owner_id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_owner_user_owner_id ON owner_user(owner_id);
            CREATE INDEX IF NOT EXISTS idx_owner_user_user_id ON owner_user(user_id);
            CREATE INDEX IF NOT EXISTS idx_owner_user_is_active ON owner_user(is_active);
        `
    },
    {
        name: '005_link_proprietaires_to_owners',
        sql: `
            -- Lier automatiquement les propriétaires à leur owner via l'email
            INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date,
                can_view_finances, can_edit_properties, can_manage_tenants,
                can_manage_contracts, can_validate_payments, can_manage_users, can_delete_data)
            SELECT 
                o.id as owner_id,
                u.id as user_id,
                'owner' as role,
                TRUE, CURRENT_DATE,
                TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
            FROM users u
            JOIN owners o ON LOWER(o.email) = LOWER(u.email)
            WHERE u.role IN ('proprietaire', 'owner', 'gestionnaire', 'manager')
              AND u.statut IN ('actif', 'active', 'Actif')
            ON CONFLICT (owner_id, user_id) DO NOTHING;
        `
    },
    {
        name: '006_notifications_table',
        sql: `
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) DEFAULT 'info',
                title VARCHAR(255),
                message TEXT,
                link VARCHAR(500),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        `
    },
    {
        name: '007_tenants_statut_pending',
        sql: `
            -- S'assurer que la colonne statut accepte 'En attente'
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tenants' AND column_name = 'statut'
                ) THEN
                    -- Modifier le type si c'est un enum, sinon ignore
                    BEGIN
                        ALTER TABLE tenants ALTER COLUMN statut TYPE VARCHAR(50);
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'statut column already VARCHAR or error: %', SQLERRM;
                    END;
                END IF;
            END $$;
        `
    },
    {
        name: '008_tenants_user_id_column',
        sql: `
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
        `
    },
    {
        name: '009_users_preferences_is_guest',
        // CAUSE DIRECTE DU 500 SUR /profile — ces colonnes sont SELECT-ées dans authRoutes.ts
        sql: `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'actif';
        `
    },
    {
        name: '010_users_photo_url',
        sql: `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
        `
    },
    {
        name: '011_owner_user_missing_columns',
        // La table owner_user a été créée sans ces colonnes dans l'ancienne migration
        // Le code /auth/profile les SELECT-e -> crash 500 pour les locataires
        sql: `
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT FALSE;
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_delete_data BOOLEAN DEFAULT FALSE;
            ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS can_access_audit_logs BOOLEAN DEFAULT FALSE;
        `
    },
    {
        name: '012_generate_manager_codes',
        // CRITIQUE: Les owners existants n'ont PAS de manager_code généré
        // La colonne existe mais les données sont NULL -> link-tenant et badge ne fonctionnent pas
        sql: `
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20);
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'unique_manager_code'
                ) THEN
                    ALTER TABLE owners ADD CONSTRAINT unique_manager_code UNIQUE (manager_code);
                END IF;
            END $$;
            UPDATE owners 
            SET manager_code = 'AG-' || UPPER(SUBSTRING(MD5(id::text || name || RANDOM()::text), 1, 6))
            WHERE manager_code IS NULL OR manager_code = '';
            CREATE INDEX IF NOT EXISTS idx_owners_manager_code ON owners(manager_code);
        `
    },
    {
        name: '013_auto_link_owners_to_users',
        // CRITIQUE: Les propriétaires existants n'ont PAS de lien owner_user
        // Sans ce lien, /auth/manager-code ne trouve rien -> le badge ne s'affiche pas
        sql: `
            INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date,
                can_view_finances, can_edit_properties, can_manage_tenants, 
                can_manage_contracts, can_validate_payments)
            SELECT o.id, u.id, 'owner', TRUE, CURRENT_DATE,
                TRUE, TRUE, TRUE, TRUE, TRUE
            FROM owners o
            JOIN users u ON LOWER(u.email) = LOWER(o.email)
            WHERE o.email IS NOT NULL AND o.email != ''
            ON CONFLICT (owner_id, user_id) DO NOTHING;
        `
    },
    {
        name: '014_tenants_user_id_invitation_code',
        // CRITIQUE: La colonne user_id dans tenants N'EXISTE PAS en prod
        // C'est la cause directe du 500 sur link-tenant
        sql: `
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invitation_code VARCHAR(50);
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'Actif';
            CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
            CREATE INDEX IF NOT EXISTS idx_tenants_invitation_code ON tenants(invitation_code);
        `
    },
    {
        name: '015_fix_tenants_null_type',
        sql: `
            UPDATE tenants SET type = 'Locataire' WHERE type IS NULL;
        `
    },
    {
        name: '016_create_notification_settings',
        sql: `
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                alert_type VARCHAR(50) NOT NULL,
                channel_email BOOLEAN DEFAULT TRUE,
                channel_whatsapp BOOLEAN DEFAULT FALSE,
                channel_sms BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, alert_type)
            );
            CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
        `
    },
    {
        name: '017_manager_code',
        sql: `
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20);
            UPDATE owners SET manager_code = 'AG-' || UPPER(SUBSTRING(MD5(id::text || COALESCE(name,'') || RANDOM()::text), 1, 6))
            WHERE manager_code IS NULL OR manager_code = '';
            CREATE INDEX IF NOT EXISTS idx_owners_manager_code ON owners(manager_code);
        `
    },
    {
        name: '018_fix_manager_code_not_null',
        sql: `
            ALTER TABLE owners ALTER COLUMN manager_code DROP NOT NULL;
        `
    },
    {
        name: '019_fix_audit_logs_schema',
        sql: `
            -- S'assurer que la table exists (au cas où elle n'aurait pas été créée par init.sql)
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255),
                action VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Ajouter les colonnes manquantes
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(100);
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
            
            -- Corriger les types si nécessaire (UUID -> VARCHAR pour supporter les IDs numériques)
            ALTER TABLE audit_logs ALTER COLUMN user_id TYPE VARCHAR(255);
            ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);
        `
    },
    {
        name: '020_owners_missing_columns',
        sql: `
            -- Ajouter les colonnes manquantes à la table owners
            -- Ces colonnes existent en local mais manquent en production
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS photo_url TEXT;
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS rccm_number VARCHAR(100);
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50);
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS mobile_money_coordinates VARCHAR(255);
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS delegation_start_date DATE;
            ALTER TABLE owners ADD COLUMN IF NOT EXISTS delegation_end_date DATE;
        `
    },
    {
        name: '021_buildings_total_lots',
        sql: `
            -- Ajouter le champ total_lots à la table buildings
            ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_lots INTEGER DEFAULT 0;
        `
    },
    {
        name: '022_user_invitations_table',
        sql: `
            -- Créer la table user_invitations si elle n'existe pas (avec user_id inclus)
            CREATE TABLE IF NOT EXISTS user_invitations (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'viewer',
                issuer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
                permissions JSONB DEFAULT '{}',
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
            CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
            CREATE INDEX IF NOT EXISTS idx_user_invitations_user_id ON user_invitations(user_id);
            -- Au cas où la table existait déjà sans user_id
            ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `
    },
    {
        name: '023_users_invite_columns',
        sql: `
            -- Colonnes requises par l'endpoint invite-user
            ALTER TABLE users ADD COLUMN IF NOT EXISTS access_scope VARCHAR(20) DEFAULT 'assigned';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
        `
    },
    {
        name: '024_permission_matrix',
        sql: `
            CREATE TABLE IF NOT EXISTS permission_matrix (
                role VARCHAR(50) NOT NULL,
                module VARCHAR(50) NOT NULL,
                can_read BOOLEAN DEFAULT FALSE,
                can_write BOOLEAN DEFAULT FALSE,
                can_delete BOOLEAN DEFAULT FALSE,
                can_validate BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (role, module)
            );

            INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
            VALUES 
            ('admin', 'dashboard', TRUE, TRUE, TRUE, TRUE),
            ('admin', 'biens', TRUE, TRUE, TRUE, TRUE),
            ('admin', 'locataires', TRUE, TRUE, TRUE, TRUE),
            ('admin', 'finance', TRUE, TRUE, TRUE, TRUE),
            ('admin', 'users', TRUE, TRUE, TRUE, TRUE),
            ('admin', 'owners', TRUE, TRUE, TRUE, TRUE),
            ('gestionnaire', 'dashboard', TRUE, FALSE, FALSE, FALSE),
            ('gestionnaire', 'biens', TRUE, TRUE, FALSE, FALSE),
            ('gestionnaire', 'locataires', TRUE, TRUE, FALSE, FALSE),
            ('gestionnaire', 'finance', TRUE, FALSE, FALSE, FALSE),
            ('gestionnaire', 'users', FALSE, FALSE, FALSE, FALSE),
            ('gestionnaire', 'owners', TRUE, FALSE, FALSE, FALSE),
            ('manager', 'dashboard', TRUE, TRUE, FALSE, TRUE),
            ('manager', 'biens', TRUE, TRUE, TRUE, TRUE),
            ('manager', 'locataires', TRUE, TRUE, TRUE, TRUE),
            ('manager', 'finance', TRUE, TRUE, FALSE, TRUE),
            ('manager', 'users', TRUE, TRUE, FALSE, FALSE),
            ('manager', 'owners', TRUE, TRUE, FALSE, TRUE),
            ('guest', 'dashboard', TRUE, FALSE, FALSE, FALSE),
            ('guest', 'biens', TRUE, FALSE, FALSE, FALSE),
            ('guest', 'locataires', TRUE, FALSE, FALSE, FALSE),
            ('guest', 'finance', FALSE, FALSE, FALSE, FALSE)
            ON CONFLICT (role, module) DO NOTHING;
        `
    },
    {
        name: '025_users_guest_columns',
        sql: `
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS access_key VARCHAR(50) UNIQUE DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS access_key_expires_at TIMESTAMP DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS agency_id INTEGER,
            ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
            
            CREATE INDEX IF NOT EXISTS idx_users_access_key ON users(access_key);
            CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);
        `
    },
    {
        name: '026_additional_permissions',
        sql: `
            -- Add missing roles to permission_matrix
            INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
            VALUES 
            ('comptable', 'dashboard', TRUE, FALSE, FALSE, FALSE),
            ('comptable', 'biens', TRUE, FALSE, FALSE, FALSE),
            ('comptable', 'locataires', TRUE, FALSE, FALSE, FALSE),
            ('comptable', 'finance', TRUE, FALSE, FALSE, TRUE),
            ('comptable', 'owners', TRUE, FALSE, FALSE, FALSE),
            
            ('agent_recouvreur', 'dashboard', TRUE, FALSE, FALSE, FALSE),
            ('agent_recouvreur', 'biens', TRUE, FALSE, FALSE, FALSE),
            ('agent_recouvreur', 'locataires', TRUE, FALSE, FALSE, FALSE),
            ('agent_recouvreur', 'finance', TRUE, FALSE, FALSE, TRUE),
            
            ('viewer', 'dashboard', TRUE, FALSE, FALSE, FALSE),
            ('viewer', 'biens', TRUE, FALSE, FALSE, FALSE),
            ('viewer', 'locataires', TRUE, FALSE, FALSE, FALSE),
            ('viewer', 'finance', TRUE, FALSE, FALSE, FALSE),
            ('viewer', 'owners', TRUE, FALSE, FALSE, FALSE)
            ON CONFLICT (role, module) DO NOTHING;

            -- Cleanup: Some older migrations might have used 'guest' instead of 'viewer'
            -- We ensure 'viewer' is the standard for read-only guests
            UPDATE users SET role = 'viewer' WHERE role = 'guest' AND is_guest = true;
        `
    }
];

// ============================================================
// RUNNER PRINCIPAL
// ============================================================
export async function runMigrations(): Promise<void> {
    const client = await pool.connect();
    
    try {
        console.log('🔄 [Migrations] Vérification des migrations en attente...');
        
        // Créer la table de suivi si elle n'existe pas
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        // Récupérer les migrations déjà effectuées
        const { rows: done } = await client.query(
            'SELECT name FROM migrations_log'
        );
        const doneNames = new Set(done.map((r: any) => r.name));
        
        let ran = 0;
        let skipped = 0;
        
        for (const migration of MIGRATIONS) {
            if (doneNames.has(migration.name)) {
                skipped++;
                continue;
            }
            
            try {
                await client.query('BEGIN');
                await client.query(migration.sql);
                await client.query(
                    'INSERT INTO migrations_log (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                    [migration.name]
                );
                await client.query('COMMIT');
                console.log(`  ✅ [Migration] ${migration.name} — OK`);
                ran++;
            } catch (err: any) {
                await client.query('ROLLBACK');
                console.error(`  ❌ [Migration] ${migration.name} — ERREUR:`, err.message);
                // On continue avec les autres migrations même si une échoue
            }
        }
        
        console.log(`✅ [Migrations] Terminé : ${ran} exécutée(s), ${skipped} déjà faite(s).`);
        
    } catch (err) {
        console.error('❌ [Migrations] Erreur critique lors du runner:', err);
    } finally {
        client.release();
    }
}
