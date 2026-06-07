-- Migration: fix_rls_policies_multiowner.sql
-- Objectif : Mettre à jour les policies RLS simples pour supporter le mode multi-owner
-- et permettre aux locataires d'accéder à leurs propres données.
-- À exécuter en tant que superuser sur la base hopegestion.

-- 1. tenants : permettre aux locataires de voir leur propre enregistrement
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenant_isolation_policy ON tenants
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN
                owner_id IN (
                    SELECT owner_id FROM owner_user
                    WHERE user_id = get_current_user_id() AND is_active = TRUE
                )
                OR user_id = get_current_user_id()
            ELSE FALSE
        END
    );

-- 2. leases : permettre aux locataires de voir leurs baux
DROP POLICY IF EXISTS tenant_isolation_policy ON leases;
CREATE POLICY tenant_isolation_policy ON leases
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN
                owner_id IN (
                    SELECT owner_id FROM owner_user
                    WHERE user_id = get_current_user_id() AND is_active = TRUE
                )
                OR tenant_id IN (
                    SELECT id FROM tenants WHERE user_id = get_current_user_id()
                )
            ELSE FALSE
        END
    );

-- 3. payments : permettre aux locataires de voir leurs paiements
DROP POLICY IF EXISTS tenant_isolation_policy ON payments;
CREATE POLICY tenant_isolation_policy ON payments
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN
                owner_id IN (
                    SELECT owner_id FROM owner_user
                    WHERE user_id = get_current_user_id() AND is_active = TRUE
                )
                OR lease_id IN (
                    SELECT l.id FROM leases l
                    JOIN tenants t ON l.tenant_id = t.id
                    WHERE t.user_id = get_current_user_id()
                )
            ELSE FALSE
        END
    );

-- 4. lots : permettre aux locataires de voir les lots de leur bail
DROP POLICY IF EXISTS tenant_isolation_policy ON lots;
CREATE POLICY tenant_isolation_policy ON lots
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN
                owner_id IN (
                    SELECT owner_id FROM owner_user
                    WHERE user_id = get_current_user_id() AND is_active = TRUE
                )
                OR id IN (
                    SELECT l.lot_id FROM leases l
                    JOIN tenants t ON l.tenant_id = t.id
                    WHERE t.user_id = get_current_user_id()
                )
            ELSE FALSE
        END
    );

-- 5. buildings : permettre aux locataires de voir l'immeuble de leur lot
DROP POLICY IF EXISTS tenant_isolation_policy ON buildings;
CREATE POLICY tenant_isolation_policy ON buildings
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN
                owner_id IN (
                    SELECT owner_id FROM owner_user
                    WHERE user_id = get_current_user_id() AND is_active = TRUE
                )
                OR id IN (
                    SELECT lo.building_id FROM lots lo
                    JOIN leases l ON l.lot_id = lo.id
                    JOIN tenants t ON l.tenant_id = t.id
                    WHERE t.user_id = get_current_user_id()
                )
            ELSE FALSE
        END
    );

-- 6. tickets : passer de la policy simple au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON tickets;
CREATE POLICY tenant_isolation_policy ON tickets
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- 7. contracts : passer au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON contracts;
CREATE POLICY tenant_isolation_policy ON contracts
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- 8. documents : passer au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON documents;
CREATE POLICY tenant_isolation_policy ON documents
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- 9. payment_schedules : passer au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON payment_schedules;
CREATE POLICY tenant_isolation_policy ON payment_schedules
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- 10. mobile_money_configs : passer au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON mobile_money_configs;
CREATE POLICY tenant_isolation_policy ON mobile_money_configs
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- 11. mobile_money_transactions : passer au pattern CASE multi-owner
DROP POLICY IF EXISTS tenant_isolation_policy ON mobile_money_transactions;
CREATE POLICY tenant_isolation_policy ON mobile_money_transactions
    USING (
        CASE
            WHEN get_current_owner_id() IS NOT NULL THEN owner_id = get_current_owner_id()
            WHEN get_current_user_id() IS NOT NULL THEN owner_id IN (
                SELECT owner_id FROM owner_user
                WHERE user_id = get_current_user_id() AND is_active = TRUE
            )
            ELSE FALSE
        END
    );

-- Vérification finale
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
