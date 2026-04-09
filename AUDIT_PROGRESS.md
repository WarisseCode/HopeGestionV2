# AUDIT_PROGRESS — HOPE GESTION IMMOBILIÈRE
## Date de début : 9 avril 2026
## Dernière mise à jour : 9 avril 2026

---

## STATUT GLOBAL : 🔄 EN COURS

---

## PHASE 1 — AUDIT ✅ TERMINÉ

Rapport d'audit complet produit et validé.
Criticité globale : **CRITIQUE**
Vulnérabilités identifiées : 3 critiques, 6 importantes

---

## PHASE 2 — PLAN D'ACTION ✅ VALIDÉ

Ordre de correction validé par l'utilisateur :
1. Migration RLS (P#1)
2. depenseRoutes.ts - C-3
3. rentPaymentRoutes.ts - C-2
4. tenantGuard.ts - P-2
5. Webhook FedaPay - P-3
6. Audit des 34 routes restantes

---

## PHASE 3 — CORRECTIONS EN COURS

### ✅ ACTION P#1 — Migration RLS (Row-Level Security)
**Fichier :** `backend/db/migration_rls.sql`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été fait :**
- Ajout de `get_current_owner_id()` avec RAISE EXCEPTION si contexte NULL
- ENABLE ROW LEVEL SECURITY + CREATE POLICY sur 19 tables métier
- Correction schema legacy production : `buildings` avait `user_id` sans `owner_id`
  → Ajout conditionnel `owner_id` + backfill depuis `owner_user`
- Ajout tables manquantes : `expenses`, `mobile_money_transactions`
- Backfill `mobile_money_configs` (user_id → owner_id via owner_user)

**Tables protégées en production (12 actives) :**
`buildings`, `lots`, `tenants`, `leases`, `payments`, `tickets`,
`documents`, `payment_schedules`, `contracts`, `mobile_money_configs`,
`expenses`, `mobile_money_transactions`

**Tables en attente de création en prod :**
`inventories`, `interventions`, `reservations`, `edl_inspections`,
`service_contracts`, `tenant_access`, `providers`
→ Seront automatiquement protégées dès leur création (blocs conditionnels dans la migration)

**Commits :**
- `feat: migration RLS - isolation multi-tenant 19 tables`
- `fix: migration RLS - ajout owner_id buildings (schema legacy prod)`

---

### ✅ ACTION C-3 — depenseRoutes.ts (IDOR POST /api/depenses)
**Fichier :** `backend/routes/depenseRoutes.ts`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été corrigé :**
- POST / : ajout `permissions.canWrite('finance')` + `tenantGuard`
- owner_id vient de `resolvedOwnerId` — jamais déduit du building_id client
- Toutes les routes utilisent `req.dbClient` (RLS actif) — pool.query() supprimé
- `buildOwnerWhereClause` + `filterByOwner` supprimés (inutiles avec RLS)
- Validation basique ajoutée sur POST (category + amount requis)

**Commit :** `fix(security): depenseRoutes - tenantGuard + RLS, owner_id depuis resolvedOwnerId (C-3)`

---

### ✅ ACTION C-2 — rentPaymentRoutes.ts (IDOR routes locataire)
**Fichier :** `backend/routes/rentPaymentRoutes.ts`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été corrigé (3 routes) :**
- `GET /:leaseId/pending` : vérification `leases.tenant_id → tenants.user_id = req.userId`
- `GET /verify/:transactionId` : vérification `rent_payment_transactions.tenant_id → tenants.user_id`
- `GET /receipt/:transactionId` : même vérification — 403 si non propriétaire
- Webhook FedaPay et routes admin intentionnellement non touchés

**Commit :** `fix(security): rentPaymentRoutes - vérification ownership sur 3 routes IDOR locataire (C-2)`

---

### ✅ ACTION P-2 — tenantGuard.ts (owner_id depuis req.body/query)
**Fichier :** `backend/middleware/tenantGuard.ts`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été corrigé :**
- Ligne 13 : `req.query.owner_id` et `req.body.owner_id` retirés
- Seul `req.headers['x-owner-id']` est accepté comme source de owner_id client
- La validation DB (ligne 35) reste inchangée — owner_id toujours vérifié contre owner_user

**Commit :** `fix(security): tenantGuard - owner_id accepté uniquement via X-Owner-Id header (P-2)`

---

### ✅ ACTION P-3 — Webhook FedaPay (vérification anti-forgery)
**Fichier :** `backend/routes/rentPaymentRoutes.ts`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Approche retenue :** Re-vérification via API FedaPay (sk_live) plutôt que HMAC.
Les clés sk_sandbox/sk_live suffisent — pas besoin de Webhook Secret séparé.

**Ce qui a été ajouté :**
- Appel `fedapayService.getTransactionStatus(fedapayTransactionId)` avant tout traitement
- Si FedaPay ne confirme pas la transaction → ignoré (200, reason: unverifiable)
- Si le statut FedaPay diffère du payload webhook → ignoré (200, reason: status_mismatch)
- Import de `fedapayService` ajouté dans le fichier de routes

**Commit :** `fix(security): webhook FedaPay - re-vérification statut via API avant traitement (P-3)`

---

### ⏳ ACTION D-6 — Audit des 34 routes restantes
**Statut :** EN ATTENTE (après les 5 corrections critiques)

---

## RÈGLES D'ARCHITECTURE EN VIGUEUR

Voir `ARCHITECTURE_RULES.md` (à créer après les corrections critiques)

1. Toute requête vers une table métier passe par `req.dbClient` (tenantGuard)
2. `owner_id` vient UNIQUEMENT de `(req as any).resolvedOwnerId`
3. Jamais de `pool.query()` dans les routes gestionnaire
4. Ordre middleware : `protect → tenantGuard → multer → handler`
5. Services DB reçoivent `dbClient` en paramètre
6. Tout UPDATE/DELETE : 404 si `rowCount === 0`
