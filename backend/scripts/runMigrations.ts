// backend/scripts/runMigrations.ts
//
// ARCHITECTURE BASE DE DONNÉES
// ─────────────────────────────────────────────────────────────────────────────
// Deux étapes pour un environnement complet :
//
//   1. backend/db/init.sql  — crée les 7 tables de base (users, buildings, lots,
//      tenants, leases, payments, tickets).  À exécuter UNE FOIS manuellement sur
//      une base fraîche : psql $DATABASE_URL -f backend/db/init.sql
//
//   2. Ce fichier (runMigrations.ts) — applique toutes les migrations incrémentales
//      au-dessus de ces 7 tables.  S'exécute AUTOMATIQUEMENT à chaque démarrage
//      du backend (index.ts).  Chaque migration est idempotente (IF NOT EXISTS /
//      ON CONFLICT) et tracée dans la table `migrations_log`.
//
// Note : les anciens fichiers SQL de _archive/ ont été consolidés ici.
// ─────────────────────────────────────────────────────────────────────────────

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
        name: '000_create_missing_base_tables',
        sql: `
            -- Table OWNERS (propriétaires) — nécessaire avant les migrations 001-003
            CREATE TABLE IF NOT EXISTS owners (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) NOT NULL DEFAULT 'individual',
                name VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                phone VARCHAR(20) NOT NULL,
                phone_secondary VARCHAR(20),
                email VARCHAR(255),
                address TEXT,
                city VARCHAR(100),
                country VARCHAR(100) DEFAULT 'Bénin',
                id_number VARCHAR(100),
                photo VARCHAR(255),
                mobile_money_number VARCHAR(20),
                management_mode VARCHAR(20) DEFAULT 'direct',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);
            CREATE INDEX IF NOT EXISTS idx_owners_is_active ON owners(is_active);

            -- Table TASKS — module Tâches
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                entity_type VARCHAR(50),
                entity_id INT,
                assigned_to INT,
                created_by INT,
                priority VARCHAR(50) DEFAULT 'medium',
                status VARCHAR(50) DEFAULT 'todo',
                due_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

            -- Table MESSAGES — communication interne
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INT NOT NULL,
                recipient_id INT,
                context_type VARCHAR(50),
                context_id INT,
                channel VARCHAR(50) DEFAULT 'internal',
                content TEXT,
                attachments JSONB DEFAULT '[]'::jsonb,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_context ON messages(context_type, context_id);

            -- Table NOTIFICATION_PREFERENCES
            CREATE TABLE IF NOT EXISTS notification_preferences (
                user_id INT PRIMARY KEY,
                preferred_channels JSONB DEFAULT '["email", "internal"]'::jsonb,
                quiet_hours_start TIME,
                quiet_hours_end TIME,
                alert_types JSONB DEFAULT '{"task_assigned": true, "task_overdue": true, "new_message": true}'::jsonb,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Table PAYMENT_SCHEDULES — échéanciers de loyer
            -- Référencée par la migration 028_rent_payment_transactions
            CREATE TABLE IF NOT EXISTS payment_schedules (
                id SERIAL PRIMARY KEY,
                lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
                total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
                amount_paid DECIMAL(12, 2) DEFAULT 0,
                due_date DATE,
                status VARCHAR(50) DEFAULT 'pending',
                statut VARCHAR(50) DEFAULT 'en_attente',
                description TEXT,
                date_reglement_final TIMESTAMP,
                numero_echeance INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_payment_schedules_lease_id ON payment_schedules(lease_id);
            CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
            CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);

            -- Tables CARNET (notes, contacts, actions terrain)
            CREATE TABLE IF NOT EXISTS notebook_notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255),
                content TEXT,
                type VARCHAR(50) DEFAULT 'general',
                entity_type VARCHAR(50),
                entity_id INTEGER,
                visibility VARCHAR(20) DEFAULT 'private',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notebook_notes_user_id ON notebook_notes(user_id);

            CREATE TABLE IF NOT EXISTS notebook_contacts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100),
                phone VARCHAR(50),
                email VARCHAR(255),
                address TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notebook_contacts_user_id ON notebook_contacts(user_id);

            CREATE TABLE IF NOT EXISTS notebook_field_actions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) DEFAULT 'visite',
                description TEXT,
                photo_url TEXT,
                location_lat DECIMAL(10, 7),
                location_lng DECIMAL(10, 7),
                location_address VARCHAR(500),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notebook_field_actions_user_id ON notebook_field_actions(user_id);
        `
    },
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
    },
    {
        name: '028_rent_payment_transactions',
        sql: `
            CREATE TABLE IF NOT EXISTS rent_payment_transactions (
                id SERIAL PRIMARY KEY,
                schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE CASCADE,
                lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                amount DECIMAL(12, 2) NOT NULL,
                
                fedapay_transaction_id VARCHAR(255) UNIQUE,
                fedapay_reference VARCHAR(255),
                payment_url TEXT,
                
                status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                
                custom_metadata JSONB,
                error_message TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_schedule ON rent_payment_transactions(schedule_id);
            CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_lease ON rent_payment_transactions(lease_id);
            CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_tenant ON rent_payment_transactions(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_status ON rent_payment_transactions(status);
            CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_fedapay_id ON rent_payment_transactions(fedapay_transaction_id);

            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'payments' AND column_name = 'quittance_url'
                ) THEN
                    ALTER TABLE payments ADD COLUMN quittance_url TEXT;
                END IF;
            END $$;
        `
    },
    {
        name: '029_mobile_money_tables',
        sql: `
            CREATE TABLE IF NOT EXISTS mobile_money_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                nom VARCHAR(100) NOT NULL,
                operateur VARCHAR(50) NOT NULL,
                numero VARCHAR(50) NOT NULL,
                statut VARCHAR(50) DEFAULT 'actif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mobile_money_transactions (
                id SERIAL PRIMARY KEY,
                amount DECIMAL(12, 2) NOT NULL,
                phone_number VARCHAR(50) NOT NULL,
                operator VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                transaction_type VARCHAR(50) NOT NULL,
                external_reference TEXT,
                transaction_id VARCHAR(255),
                payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_mobile_money_configs_user_id ON mobile_money_configs(user_id);
            CREATE INDEX IF NOT EXISTS idx_momo_tx_operator ON mobile_money_transactions(operator);
            CREATE INDEX IF NOT EXISTS idx_momo_tx_status ON mobile_money_transactions(status);
        `
    },
    {
        name: '030_create_document_templates',
        sql: `
            CREATE TABLE IF NOT EXISTS document_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Insérer les modèles par défaut si la table est vide
            INSERT INTO document_templates (name, type, content, is_default)
            SELECT 'Contrat de Location Standard', 'lease', 'CONTRAT DE BAIL\n\nEntre les soussignés :\n\nLE BAILLEUR : {{Nom du Propriétaire}}\nReprésenté par l''agence Hope Gestion\n\nET\n\nLE PRENEUR : {{Nom du Locataire}}\n\nIL A ÉTÉ CONVENU CE QUI SUIT :\n\nLe Bailleur donne en location le bien situé à : {{Adresse du Bien}}.\n\nLoyer mensuel : {{Montant du Loyer}} FCFA.\nDate début : {{Date de Début}}.\n', TRUE
            WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE type = 'lease');
            
            INSERT INTO document_templates (name, type, content, is_default)
            SELECT 'Quittance de Loyer Simple', 'receipt', 'QUITTANCE DE LOYER\n\nPériode : {{Période}}\n\nReçu de M/Mme {{Nom du Locataire}}\nLa somme de {{Montant Payé}} FCFA\nPour le loyer du bien situé à : {{Adresse du Bien}}.\n\nFait le {{Date du Jour}}.', TRUE
            WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE type = 'receipt');
        `
    },
    {
        name: '031_document_permissions',
        sql: `
            -- Ajouter les permissions pour le module documents
            INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
            VALUES 
            ('admin', 'documents', TRUE, TRUE, TRUE, TRUE),
            ('gestionnaire', 'documents', TRUE, TRUE, FALSE, FALSE),
            ('manager', 'documents', TRUE, TRUE, FALSE, TRUE),
            ('comptable', 'documents', TRUE, FALSE, FALSE, FALSE),
            ('agent_recouvreur', 'documents', TRUE, FALSE, FALSE, FALSE),
            ('viewer', 'documents', TRUE, FALSE, FALSE, FALSE)
            ON CONFLICT (role, module) DO NOTHING;
            
            -- Corriger les permissions de documents pour les owners si existants
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM permission_matrix WHERE role = 'owner') THEN
                    INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
                    VALUES ('owner', 'documents', TRUE, FALSE, FALSE, FALSE)
                    ON CONFLICT (role, module) DO NOTHING;
                END IF;
            END $$;
        `
    },
    {
        name: '032_dismissed_alerts',
        sql: `
            -- Table pour persister les alertes ignorées par utilisateur
            CREATE TABLE IF NOT EXISTS dismissed_alerts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alert_id VARCHAR(100) NOT NULL,
                dismissed_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, alert_id)
            );
            CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_user ON dismissed_alerts(user_id);
        `
    },
    {
        name: '033_google_oauth_columns',
        sql: `
            -- Colonnes nécessaires pour Google OAuth (googleAuthRoutes.ts)
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
            CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        `
    },
    {
        name: '034_email_verification_columns',
        sql: `
            -- Colonnes nécessaires pour la vérification email par OTP (authRoutes.ts)
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(6);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
        `
    },
    {
        name: '035_password_reset_tokens_table',
        sql: `
            -- Table pour stocker les tokens de réinitialisation de mot de passe
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                ip_address VARCHAR(45),
                user_agent TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
            CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens(expires_at);
            CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
        `
    },
    {
        name: '036_fix_superadmin_email',
        sql: `
            -- Corriger l'email du super admin et le marquer comme vérifié
            UPDATE users 
            SET email = 'contact@hopegestion.com', 
                is_verified = true
            WHERE email = 'ayinla@gmail.com' 
              AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'contact@hopegestion.com');
        `
    },
    {
        name: '037_subscription_plans',
        sql: `
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                price INTEGER NOT NULL DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'FCFA',
                duration_days INTEGER NOT NULL DEFAULT 30,
                max_properties INTEGER DEFAULT 5,
                max_lots INTEGER DEFAULT 20,
                max_users INTEGER DEFAULT 3,
                features JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            -- Insert default plans
            INSERT INTO subscription_plans (name, description, price, duration_days, max_properties, max_lots, max_users, features) VALUES
                ('Gratuit', 'Plan de démarrage', 0, 36500, 2, 10, 2, '["Dashboard basique","1 agence","Support email"]'),
                ('Pro', 'Pour les gestionnaires professionnels', 15000, 30, 10, 50, 5, '["Dashboard avancé","Rapports","Multi-agences","Support prioritaire"]'),
                ('Enterprise', 'Pour les grandes entreprises', 45000, 30, -1, -1, -1, '["Tout illimité","API accès","Support dédié","Formation incluse"]')
            ON CONFLICT (name) DO NOTHING;
        `
    },
    {
        name: '038_user_subscriptions',
        sql: `
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
                status VARCHAR(20) DEFAULT 'active',
                starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cancelled_at TIMESTAMP NULL,
                notes TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_usub_user_id ON user_subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_usub_status ON user_subscriptions(status);
        `
    },
    {
        name: '039_refresh_tokens_table',
        sql: `
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                revoked_at TIMESTAMPTZ DEFAULT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
        `
    },
    {
        name: '040_public_read_policies',
        // Sans ces policies PERMISSIVE, publicRoutes.ts (sans contexte owner)
        // déclenche get_current_owner_id() qui lève une exception → 500 → page publique vide.
        sql: `
            -- Policy PERMISSIVE : lecture publique des lots libres/vacants/disponibles
            DROP POLICY IF EXISTS public_read_libre_lots ON lots;
            CREATE POLICY public_read_libre_lots ON lots
                AS PERMISSIVE
                FOR SELECT
                USING (LOWER(statut) IN ('libre', 'vacant', 'disponible'));

            -- Policy PERMISSIVE : lecture publique des immeubles actifs/libres/disponibles
            DROP POLICY IF EXISTS public_read_actif_buildings ON buildings;
            CREATE POLICY public_read_actif_buildings ON buildings
                AS PERMISSIVE
                FOR SELECT
                USING (LOWER(statut) IN ('actif', 'libre', 'disponible'));
        `
    },
    {
        name: '041_gestionnaire_finance_write',
        // Le gestionnaire doit pouvoir générer les appels de loyer et créer des écritures.
        // La permission_matrix avait can_write = FALSE pour (gestionnaire, finance),
        // ce qui bloquait POST /finances/generate-schedules avec "Accès refusé".
        sql: `
            UPDATE permission_matrix
            SET can_write = TRUE
            WHERE role = 'gestionnaire' AND module = 'finance';
        `
    },
    {
        name: '042_cleanup_welcome_notif_duplicates',
        // migration_notifications.sql insérait une notif "Bienvenue" à chaque déploiement
        // car ON CONFLICT DO NOTHING ne fonctionne pas sans contrainte UNIQUE.
        // On supprime tous les doublons en ne conservant que la 1ère occurrence par user.
        sql: `
            DELETE FROM notifications
            WHERE title = 'Bienvenue sur HopeGestion'
              AND id NOT IN (
                  SELECT MIN(id)
                  FROM notifications
                  WHERE title = 'Bienvenue sur HopeGestion'
                  GROUP BY user_id
              );
        `
    },
    {
        name: '043_fix_subscription_schema',
        sql: `
            -- Colonne manquante dans subscription_payments (crash silencieux du webhook FedaPay)
            ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

            -- Colonne cancelled_at pour tracer les annulations d'abonnements
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL;

            -- Index UNIQUE partiel : un seul abonnement actif ou en attente par utilisateur.
            -- Requis pour que le ON CONFLICT du webhook fonctionne correctement.
            CREATE UNIQUE INDEX IF NOT EXISTS unique_active_subscription_per_user
            ON subscriptions(user_id)
            WHERE status IN ('active', 'pending_payment');
        `
    },
    {
        name: '044_fix_phone_varchar',
        // subscription_payments.phone_number était VARCHAR(20) : trop court pour
        // les nouveaux numéros béninois à 10 chiffres (+229 01 96 00 01 02 = 19 chars)
        sql: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'subscription_payments'
                      AND column_name = 'phone_number'
                      AND character_maximum_length <= 20
                ) THEN
                    ALTER TABLE subscription_payments ALTER COLUMN phone_number TYPE VARCHAR(30);
                END IF;
            END $$;
        `
    },
    {
        name: '045_remove_caution_avance_tenants',
        // caution et avance n'ont de sens qu'au niveau du bail (leases) et du bien (lots).
        // Retrait du formulaire locataire côté UI → on nettoie aussi le schéma.
        sql: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'tenants' AND column_name = 'caution'
                ) THEN
                    ALTER TABLE tenants DROP COLUMN caution;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'tenants' AND column_name = 'avance'
                ) THEN
                    ALTER TABLE tenants DROP COLUMN avance;
                END IF;
            END $$;
        `
    },
    {
        name: '046_cleanup_orphan_columns',
        // nbpieces (lots) : ajoutée en migration 21 comme fallback de nb_pieces, jamais utilisée
        //   en écriture — le backend écrit toujours nb_pieces. Double lecture fragile supprimée.
        // user_id (buildings) : résidu d'une ancienne architecture, remplacé par owner_id partout.
        sql: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'lots' AND column_name = 'nbpieces'
                ) THEN
                    ALTER TABLE lots DROP COLUMN nbpieces;
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'buildings' AND column_name = 'user_id'
                ) THEN
                    ALTER TABLE buildings DROP COLUMN user_id;
                END IF;
            END $$;
        `
    },
    {
        name: '047_expenses_tables',
        // expenses et expense_categories étaient créées par _archive/migration_finance.sql
        // et _archive/create_finance_tables.sql — jamais intégrées dans ce runner.
        // Sans elles, expenseRoutes, depenseRoutes, taxRoutes et FinanceService échouent.
        // On complète aussi mobile_money_transactions avec les colonnes currency + expense_id.
        sql: `
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
                lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
                owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT,
                amount NUMERIC(15, 2) NOT NULL,
                date_expense DATE DEFAULT CURRENT_DATE,
                supplier_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'paye',
                proof_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_building ON expenses(building_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date_expense);

            CREATE TABLE IF NOT EXISTS expense_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                is_deductible BOOLEAN DEFAULT TRUE,
                description TEXT
            );
            INSERT INTO expense_categories (name, is_deductible) VALUES
                ('Travaux / Entretien', true),
                ('Assurance Immeuble', true),
                ('Assurance PNO', true),
                ('Taxe Foncière', true),
                ('Frais de Gestion', true),
                ('Frais Juridiques', true),
                ('Frais Bancaires', true),
                ('Eau / Electricité (Partie Commune)', true),
                ('Gardiennage', true),
                ('Autre', false)
            ON CONFLICT (name) DO NOTHING;

            -- Colonnes ajoutées dans create_finance_tables mais absentes du runner
            ALTER TABLE mobile_money_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'XOF';
            ALTER TABLE mobile_money_transactions ADD COLUMN IF NOT EXISTS expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL;
            ALTER TABLE mobile_money_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `
    },
    {
        name: '048_subscriptions_legacy',
        // plans, subscriptions, subscription_payments viennent de _archive/12_create_subscriptions.sql.
        // Les migrations 043 et 044 (déjà dans le runner) ALTER ces tables — elles échouent
        // silencieusement sur une installation fraîche car les tables n'existent pas encore.
        sql: `
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                display_name VARCHAR(100),
                price DECIMAL(12, 2) NOT NULL DEFAULT 0,
                duration_months INTEGER DEFAULT 1,
                max_properties INTEGER DEFAULT 5,
                max_tenants INTEGER DEFAULT 10,
                features JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO plans (name, display_name, price, duration_months, max_properties, max_tenants, features) VALUES
                ('free',       'Gratuit',         0,     0, 3,  5,  '["Gestion basique", "3 biens max", "5 locataires max"]'),
                ('pro',        'Professionnel', 15000,   1, 20, 50, '["Gestion illimitée", "20 biens", "50 locataires", "Rapports avancés", "Support prioritaire"]'),
                ('enterprise', 'Entreprise',    50000,   1, -1, -1, '["Biens illimités", "Locataires illimités", "API Access", "Multi-agences", "Support dédié"]')
            ON CONFLICT (name) DO NOTHING;

            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
                status VARCHAR(50) DEFAULT 'active',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP,
                cancelled_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

            CREATE TABLE IF NOT EXISTS subscription_payments (
                id SERIAL PRIMARY KEY,
                subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
                amount DECIMAL(12, 2) NOT NULL,
                operator VARCHAR(50),
                phone_number VARCHAR(30),
                transaction_reference VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_plan_id') THEN
                    ALTER TABLE users ADD COLUMN current_plan_id INTEGER REFERENCES plans(id) DEFAULT 1;
                END IF;
            END $$;

            -- Index unique partiel requis par migration 043 (webhook FedaPay)
            CREATE UNIQUE INDEX IF NOT EXISTS unique_active_subscription_per_user
            ON subscriptions(user_id)
            WHERE status IN ('active', 'pending_payment');
        `
    },
    {
        name: '049_edl_tables',
        // Tables du module État des Lieux — de _archive/create_edl_tables.sql.
        // Correction : la FK d'origine pointait sur 'baux' (ancien nom) → remplacée par 'leases'.
        sql: `
            CREATE TABLE IF NOT EXISTS edl_inspections (
                id SERIAL PRIMARY KEY,
                ref_edl VARCHAR(50) UNIQUE NOT NULL,
                lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
                location_id INTEGER REFERENCES leases(id) ON DELETE SET NULL,
                type_edl VARCHAR(20) NOT NULL CHECK (type_edl IN ('entree', 'sortie', 'intermediaire')),
                date_realisation TIMESTAMP NOT NULL DEFAULT NOW(),
                agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                agent_name VARCHAR(255),
                locataire_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                locataire_name VARCHAR(255),
                locataire_present BOOLEAN DEFAULT true,
                statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'signe', 'cloture', 'archive')),
                commentaires TEXT,
                signatures_json JSONB DEFAULT '{}'::jsonb,
                parent_edl_id INTEGER REFERENCES edl_inspections(id) ON DELETE SET NULL,
                validated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_edl_lot ON edl_inspections(lot_id);
            CREATE INDEX IF NOT EXISTS idx_edl_location ON edl_inspections(location_id);
            CREATE INDEX IF NOT EXISTS idx_edl_type ON edl_inspections(type_edl);
            CREATE INDEX IF NOT EXISTS idx_edl_statut ON edl_inspections(statut);
            CREATE INDEX IF NOT EXISTS idx_edl_parent ON edl_inspections(parent_edl_id);

            CREATE TABLE IF NOT EXISTS edl_items (
                id SERIAL PRIMARY KEY,
                edl_id INTEGER REFERENCES edl_inspections(id) ON DELETE CASCADE,
                inventory_item_id INTEGER,
                piece VARCHAR(100) NOT NULL,
                categorie VARCHAR(100),
                nom VARCHAR(255) NOT NULL,
                description TEXT,
                etat VARCHAR(20) NOT NULL CHECK (etat IN ('neuf', 'bon', 'usager', 'mauvais', 'hs')),
                quantite INTEGER DEFAULT 1,
                observation TEXT,
                photos JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_edl_items_edl ON edl_items(edl_id);
            CREATE INDEX IF NOT EXISTS idx_edl_items_piece ON edl_items(piece);

            CREATE SEQUENCE IF NOT EXISTS edl_ref_seq START 1;

            CREATE OR REPLACE FUNCTION update_edl_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_edl_inspections_updated_at ON edl_inspections;
            CREATE TRIGGER trigger_edl_inspections_updated_at
                BEFORE UPDATE ON edl_inspections
                FOR EACH ROW EXECUTE FUNCTION update_edl_updated_at();

            DROP TRIGGER IF EXISTS trigger_edl_items_updated_at ON edl_items;
            CREATE TRIGGER trigger_edl_items_updated_at
                BEFORE UPDATE ON edl_items
                FOR EACH ROW EXECUTE FUNCTION update_edl_updated_at();
        `
    },
    {
        name: '049b_edl_owner_id',
        // edlRoutes.ts insère edl_inspections.owner_id, mais la migration 049 ne créait
        // pas cette colonne (elle n'existait qu'en prod, ajoutée à la main → dérive de schéma :
        // toute base reconstruite depuis les migrations plantait à la création d'un EDL).
        // L'isolation par propriétaire repose sur ce champ (filtrage explicite côté route,
        // cf. edlRoutes — défense en profondeur, le rôle DB pouvant contourner la RLS).
        sql: `
            ALTER TABLE edl_inspections
                ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_edl_owner ON edl_inspections(owner_id);
        `
    },
    {
        name: '049c_inventory_tables',
        // Module Inventaires : inventoryRoutes.ts interroge inventories/inventory_items
        // qui n'existaient dans AUCUNE migration (présentes seulement en prod, à la main →
        // toute base reconstruite plantait). owner_id sert à l'isolation explicite (cf. routes).
        sql: `
            CREATE TABLE IF NOT EXISTS inventories (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(30) NOT NULL,
                entity_id INTEGER NOT NULL,
                type_inventaire VARCHAR(30) NOT NULL,
                date_realisation TIMESTAMP NOT NULL DEFAULT NOW(),
                agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                agent_name VARCHAR(255),
                statut VARCHAR(30) DEFAULT 'brouillon',
                commentaires TEXT,
                signature_locataire TEXT,
                signature_agent TEXT,
                owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_inventories_entity ON inventories(entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS idx_inventories_owner ON inventories(owner_id);

            CREATE TABLE IF NOT EXISTS inventory_items (
                id SERIAL PRIMARY KEY,
                inventory_id INTEGER REFERENCES inventories(id) ON DELETE CASCADE,
                categorie VARCHAR(100),
                nom VARCHAR(255) NOT NULL,
                etat VARCHAR(20) NOT NULL,
                quantite INTEGER DEFAULT 1,
                description TEXT,
                observation TEXT,
                photos JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_inventory_items_inv ON inventory_items(inventory_id);

            -- Fonction générique de mise à jour de updated_at (idempotente).
            CREATE OR REPLACE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_inventories_updated_at ON inventories;
            CREATE TRIGGER trigger_inventories_updated_at
                BEFORE UPDATE ON inventories
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();

            DROP TRIGGER IF EXISTS trigger_inventory_items_updated_at ON inventory_items;
            CREATE TRIGGER trigger_inventory_items_updated_at
                BEFORE UPDATE ON inventory_items
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `
    },
    {
        name: '049d_inventory_owner_id_backfill',
        // Filet de sécurité : si la table inventories préexistait en prod (créée à la main)
        // SANS owner_id, le CREATE TABLE IF NOT EXISTS de 049c ne l'aurait pas ajoutée, et les
        // requêtes owner-scopées (liste/détail) échoueraient (colonne absente) → liste vide.
        // On garantit la colonne + l'index, de façon idempotente.
        sql: `
            ALTER TABLE inventories ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_inventories_owner ON inventories(owner_id);
        `
    },
    {
        name: '050_loans_tax_tables',
        // loans, loan_payments, tax_settings — de _archive/create_finance_tables.sql.
        // Utilisées par loanRoutes.ts et taxRoutes.ts.
        sql: `
            CREATE TABLE IF NOT EXISTS loans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                interest_rate NUMERIC(5, 2),
                duration_months INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                monthly_payment NUMERIC(15, 2),
                payment_day INTEGER DEFAULT 5,
                owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
                building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_loans_owner ON loans(owner_id);

            CREATE TABLE IF NOT EXISTS loan_payments (
                id SERIAL PRIMARY KEY,
                loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
                due_date DATE NOT NULL,
                payment_date DATE,
                amount_total NUMERIC(15, 2) NOT NULL,
                amount_principal NUMERIC(15, 2),
                amount_interest NUMERIC(15, 2),
                amount_insurance NUMERIC(15, 2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed')),
                transaction_ref VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
            CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON loan_payments(status);
            CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON loan_payments(due_date);

            CREATE TABLE IF NOT EXISTS tax_settings (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
                country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
                fiscal_regime VARCHAR(100),
                tax_rate NUMERIC(5, 2),
                vat_subject BOOLEAN DEFAULT FALSE,
                rental_tax_rate NUMERIC(5, 2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `
    },
    {
        name: '051_calendar_tables',
        // calendar_events et reminder_settings — de _archive/create_calendar_tables.sql.
        // Utilisées par calendarRoutes.ts et CronService.ts.
        sql: `
            CREATE TABLE IF NOT EXISTS calendar_events (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                type VARCHAR(50) DEFAULT 'event',
                entity_type VARCHAR(50),
                entity_id INT,
                is_all_day BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_date);

            CREATE TABLE IF NOT EXISTS reminder_settings (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                delay_days INT NOT NULL,
                channel VARCHAR(20) NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    },
    {
        name: '052_providers_service_contracts',
        // providers, service_contracts — de _archive/create_intervention_tables.sql.
        // Utilisées par providerRoutes.ts et serviceContractRoutes.ts.
        // Ajoute aussi les colonnes manquantes sur tickets (category, provider_id, urgency, etc.)
        sql: `
            CREATE TABLE IF NOT EXISTS providers (
                id SERIAL PRIMARY KEY,
                owner_id INT DEFAULT NULL,
                name VARCHAR(255) NOT NULL,
                specialty VARCHAR(100),
                contact_name VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(255),
                address TEXT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_providers_owner ON providers(owner_id);
            CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);

            CREATE TABLE IF NOT EXISTS service_contracts (
                id SERIAL PRIMARY KEY,
                provider_id INT REFERENCES providers(id) ON DELETE SET NULL,
                owner_id INT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                cost_monthly DECIMAL(10, 2) DEFAULT 0,
                start_date DATE,
                end_date DATE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='category') THEN
                    ALTER TABLE tickets ADD COLUMN category VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='provider_id') THEN
                    ALTER TABLE tickets ADD COLUMN provider_id INT REFERENCES providers(id) ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='cost_estimated') THEN
                    ALTER TABLE tickets ADD COLUMN cost_estimated DECIMAL(10, 2) DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='cost_real') THEN
                    ALTER TABLE tickets ADD COLUMN cost_real DECIMAL(10, 2) DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='photos_before') THEN
                    ALTER TABLE tickets ADD COLUMN photos_before JSONB DEFAULT '[]'::jsonb;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='photos_after') THEN
                    ALTER TABLE tickets ADD COLUMN photos_after JSONB DEFAULT '[]'::jsonb;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='urgency') THEN
                    ALTER TABLE tickets ADD COLUMN urgency VARCHAR(50) DEFAULT 'normal';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='requester_name') THEN
                    ALTER TABLE tickets ADD COLUMN requester_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='requester_phone') THEN
                    ALTER TABLE tickets ADD COLUMN requester_phone VARCHAR(50);
                END IF;
            END $$;
        `
    },
    {
        name: '053_payments_statut_paid_to_valide',
        // Backfill : paySchedule insérait historiquement payments.statut = 'paid', valeur
        // ignorée par toutes les lectures de revenus (qui filtrent 'valide') → loyers encaissés
        // invisibles dans les KPI/graphiques + quittance introuvable. On normalise l'historique.
        // Sûr et ciblé : 'paid' n'a jamais été une valeur légitime de payments.statut
        // (valeurs attendues : 'valide' / 'en_attente' / 'annule').
        sql: `
            UPDATE payments SET statut = 'valide' WHERE statut = 'paid';
        `
    },
    {
        name: '054_manual_quittances',
        // Quittances générées manuellement (hors flux de paiement) — persistées pour alimenter
        // la liste de l'onglet "Générer manuel". Isolation par owner explicite côté route
        // (pas de policy RLS sur cette table, comme le module inventaires) : on filtre owner_id.
        sql: `
            CREATE TABLE IF NOT EXISTS manual_quittances (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
                lease_id INTEGER REFERENCES leases(id) ON DELETE SET NULL,
                numero VARCHAR(50),
                locataire_name VARCHAR(255),
                proprietaire_name VARCHAR(255),
                bien VARCHAR(255),
                periode VARCHAR(50),
                montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
                date_emission DATE,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_manual_quittances_owner ON manual_quittances(owner_id);
        `
    },
    {
        name: '055_manual_quittances_proprietaire',
        // Filet de sécurité : si 054 a déjà créé la table SANS proprietaire_name (déploiement
        // intermédiaire), on garantit la colonne de façon idempotente. Le PDF de quittance
        // affiche ce nom au lieu du libellé générique "Agence Hope Immobilier".
        sql: `
            ALTER TABLE manual_quittances ADD COLUMN IF NOT EXISTS proprietaire_name VARCHAR(255);
        `
    },
    {
        name: '056_soft_delete_corbeille',
        // Module Corbeille (CdC §XVII) : soft-delete transverse. Au lieu de supprimer les lignes,
        // on pose deleted_at/deleted_by ; les listes filtrent deleted_at IS NULL ; la corbeille
        // liste deleted_at IS NOT NULL ; restaurer = remettre à NULL ; définitif = vrai DELETE.
        // Idempotent (ADD COLUMN IF NOT EXISTS) sur les 9 tables concernées.
        sql: `
            ALTER TABLE buildings        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE lots             ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE leases           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE documents        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE edl_inspections  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE tickets          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
            ALTER TABLE messages         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

            CREATE INDEX IF NOT EXISTS idx_buildings_deleted_at       ON buildings(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_lots_deleted_at            ON lots(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at         ON tenants(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_leases_deleted_at          ON leases(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_documents_deleted_at       ON documents(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_edl_inspections_deleted_at ON edl_inspections(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_tickets_deleted_at         ON tickets(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at           ON tasks(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_messages_deleted_at        ON messages(deleted_at);
        `
    },
    {
        name: '057_manual_quittances_bailleur_contact',
        // Coordonnées du bailleur (propriétaire) figées sur la quittance manuelle pour
        // alimenter le bloc BAILLEUR du PDF (nom + adresse + tél) au lieu du générique agence.
        sql: `
            ALTER TABLE manual_quittances ADD COLUMN IF NOT EXISTS proprietaire_adresse TEXT;
            ALTER TABLE manual_quittances ADD COLUMN IF NOT EXISTS proprietaire_tel VARCHAR(50);
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
