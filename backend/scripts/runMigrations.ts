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
