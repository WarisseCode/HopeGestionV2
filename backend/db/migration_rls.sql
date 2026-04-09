-- Migration : Row-Level Security (RLS) pour Isolation Multi-Tenant
-- Description : Active l'isolation stricte des données par owner_id (TenantGuard DB Level)

-- ==============================================================================
-- 1. FONCTION HELPER (SÉCURITÉ STRICTE)
-- ==============================================================================
-- Cette fonction garantit qu'une erreur explicite est levée si le contexte
-- du tenant n'est pas défini, évitant ainsi le retour silencieux de 0 ligne 
-- (fail-safe) et rendant le bug immédiatement visible.
CREATE OR REPLACE FUNCTION get_current_owner_id() RETURNS INTEGER AS $$
DECLARE
    val TEXT;
BEGIN
    val := current_setting('app.current_owner_id', true);
    IF val IS NULL OR val = '' THEN
        RAISE EXCEPTION 'TENANT_GUARD: app.current_owner_id non défini. Accès refusé.';
    END IF;
    RETURN val::int;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. AJOUT DE LA COLONNE owner_id SUR LES TABLES MANQUANTES
-- ==============================================================================
-- Les tables métiers principales (buildings, lots, tenants, leases, payments) 
-- ont déjà owner_id. On s'assure que les autres l'ont aussi.
DO $$ 
BEGIN
    -- Table tickets (Plaintes/Interventions)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tickets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='owner_id') THEN
            ALTER TABLE tickets ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_tickets_owner_id ON tickets(owner_id);
        END IF;
    END IF;

    -- Table documents (Coffre-fort numérique / Fichiers)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='owner_id') THEN
            ALTER TABLE documents ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_documents_owner_id ON documents(owner_id);
        END IF;
    END IF;

    -- Table payment_schedules (Échéances de paiement)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_schedules') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_schedules' AND column_name='owner_id') THEN
            ALTER TABLE payment_schedules ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_payment_schedules_owner_id ON payment_schedules(owner_id);
        END IF;
    END IF;

    -- Table inventories (états des lieux)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inventories') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventories' AND column_name='owner_id') THEN
            ALTER TABLE inventories ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_inventories_owner_id ON inventories(owner_id);
        END IF;
    END IF;

    -- Table interventions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='interventions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interventions' AND column_name='owner_id') THEN
            ALTER TABLE interventions ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_interventions_owner_id ON interventions(owner_id);
        END IF;
    END IF;

    -- Table reservations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='reservations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reservations' AND column_name='owner_id') THEN
            ALTER TABLE reservations ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_reservations_owner_id ON reservations(owner_id);
        END IF;
    END IF;

    -- Table contracts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='contracts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='owner_id') THEN
            ALTER TABLE contracts ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_contracts_owner_id ON contracts(owner_id);
        END IF;
    END IF;

    -- Table mobile_money_configs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mobile_money_configs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mobile_money_configs' AND column_name='owner_id') THEN
            ALTER TABLE mobile_money_configs ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_mobile_money_configs_owner_id ON mobile_money_configs(owner_id);
        END IF;
    END IF;

    -- Table tenant_access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tenant_access') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_access' AND column_name='owner_id') THEN
            ALTER TABLE tenant_access ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_tenant_access_owner_id ON tenant_access(owner_id);
        END IF;
    END IF;

    -- Table service_contracts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='service_contracts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_contracts' AND column_name='owner_id') THEN
            ALTER TABLE service_contracts ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_service_contracts_owner_id ON service_contracts(owner_id);
        END IF;
    END IF;

    -- Table edl_inspections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='edl_inspections') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edl_inspections' AND column_name='owner_id') THEN
            ALTER TABLE edl_inspections ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_edl_inspections_owner_id ON edl_inspections(owner_id);
        END IF;
    END IF;

    -- Table providers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='providers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='providers' AND column_name='owner_id') THEN
            ALTER TABLE providers ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_providers_owner_id ON providers(owner_id);
        END IF;
    END IF;

    -- Table expenses (Dépenses) — owner_id existe déjà dans migration_finance.sql
    -- Ce bloc assure l'idempotence si la migration finance n'a pas tourné
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='owner_id') THEN
            ALTER TABLE expenses ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE;
            CREATE INDEX idx_expenses_owner_id ON expenses(owner_id);
        END IF;
    END IF;

    -- Table mobile_money_transactions — pas de owner_id à l'origine
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mobile_money_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mobile_money_transactions' AND column_name='owner_id') THEN
            ALTER TABLE mobile_money_transactions ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL;
            CREATE INDEX idx_mobile_money_transactions_owner_id ON mobile_money_transactions(owner_id);
            -- Backfill depuis payments.owner_id où payment_id est renseigné
            UPDATE mobile_money_transactions mmt
            SET owner_id = p.owner_id
            FROM payments p
            WHERE mmt.payment_id = p.id AND mmt.owner_id IS NULL AND p.owner_id IS NOT NULL;
        END IF;
    END IF;

END $$;

-- ==============================================================================
-- 2b. BACKFILL owner_id SUR mobile_money_configs (user_id → owner_id)
-- ==============================================================================
-- mobile_money_configs utilise user_id à l'origine. On alimente owner_id
-- depuis owner_user pour que le RLS fonctionne sur les lignes existantes.
-- Si un user gère plusieurs owners, on prend le premier actif (cas rare).
UPDATE mobile_money_configs mmc
SET owner_id = ou.owner_id
FROM (
    SELECT DISTINCT ON (user_id) user_id, owner_id
    FROM owner_user
    WHERE is_active = TRUE
    ORDER BY user_id, owner_id ASC
) ou
WHERE mmc.user_id = ou.user_id
  AND mmc.owner_id IS NULL;

-- ==============================================================================
-- 3. ACTIVATION DU ROW LEVEL SECURITY (RLS) ET CRÉATION DES POLICIES
-- ==============================================================================

-- BUILDINGS (Immeubles)
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON buildings;
CREATE POLICY tenant_isolation_policy ON buildings
    FOR ALL
    USING (owner_id = get_current_owner_id())
    WITH CHECK (owner_id = get_current_owner_id());

-- LOTS
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON lots;
CREATE POLICY tenant_isolation_policy ON lots
    FOR ALL
    USING (owner_id = get_current_owner_id())
    WITH CHECK (owner_id = get_current_owner_id());

-- TENANTS (Locataires)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (owner_id = get_current_owner_id())
    WITH CHECK (owner_id = get_current_owner_id());

-- LEASES (Baux)
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON leases;
CREATE POLICY tenant_isolation_policy ON leases
    FOR ALL
    USING (owner_id = get_current_owner_id())
    WITH CHECK (owner_id = get_current_owner_id());

-- PAYMENTS (Paiements)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON payments;
CREATE POLICY tenant_isolation_policy ON payments
    FOR ALL
    USING (owner_id = get_current_owner_id())
    WITH CHECK (owner_id = get_current_owner_id());

-- TICKETS (Plaintes/Interventions)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tickets') THEN
        ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON tickets;
        CREATE POLICY tenant_isolation_policy ON tickets
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- DOCUMENTS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON documents;
        CREATE POLICY tenant_isolation_policy ON documents
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- PAYMENT_SCHEDULES (Échéances)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_schedules') THEN
        ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON payment_schedules;
        CREATE POLICY tenant_isolation_policy ON payment_schedules
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- INVENTORIES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inventories') THEN
        ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON inventories;
        CREATE POLICY tenant_isolation_policy ON inventories
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- INTERVENTIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='interventions') THEN
        ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON interventions;
        CREATE POLICY tenant_isolation_policy ON interventions
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- RESERVATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='reservations') THEN
        ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON reservations;
        CREATE POLICY tenant_isolation_policy ON reservations
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- CONTRACTS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='contracts') THEN
        ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON contracts;
        CREATE POLICY tenant_isolation_policy ON contracts
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- MOBILE MONEY CONFIGS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mobile_money_configs') THEN
        ALTER TABLE mobile_money_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON mobile_money_configs;
        CREATE POLICY tenant_isolation_policy ON mobile_money_configs
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- TENANT ACCESS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tenant_access') THEN
        ALTER TABLE tenant_access ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_access;
        CREATE POLICY tenant_isolation_policy ON tenant_access
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- SERVICE CONTRACTS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='service_contracts') THEN
        ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON service_contracts;
        CREATE POLICY tenant_isolation_policy ON service_contracts
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- EDL INSPECTIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='edl_inspections') THEN
        ALTER TABLE edl_inspections ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON edl_inspections;
        CREATE POLICY tenant_isolation_policy ON edl_inspections
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- PROVIDERS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='providers') THEN
        ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON providers;
        CREATE POLICY tenant_isolation_policy ON providers
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- EXPENSES (Dépenses)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON expenses;
        CREATE POLICY tenant_isolation_policy ON expenses
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;

-- MOBILE MONEY TRANSACTIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mobile_money_transactions') THEN
        ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON mobile_money_transactions;
        CREATE POLICY tenant_isolation_policy ON mobile_money_transactions
            FOR ALL
            USING (owner_id = get_current_owner_id())
            WITH CHECK (owner_id = get_current_owner_id());
    END IF;
END $$;


-- ==============================================================================
-- MESSAGE DE CONFIRMATION
-- ==============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration Row-Level Security (RLS) préparée avec succès.';
END $$;

-- ==============================================================================
-- 4. VÉRIFICATION DE SÉCURITÉ (Liste des tables avec RLS activé)
-- ==============================================================================
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
