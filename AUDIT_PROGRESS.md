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

### ✅ ACTION D-6 — Audit des 34 routes restantes
**Statut :** TERMINÉ (inventaire)
**Date :** 9 avril 2026

Nouvelles vulnérabilités découvertes :
- C-5 : taxRoutes.ts — IDOR via req.params.ownerId (URGENT)
- P-4 : financeRoutes.ts — buildOwnerWhereClause + pool.query (Haute)
- P-5 : loanRoutes.ts — pas d'isolation tenant (Haute)
- P-6 : messageRoutes.ts — pas de tenant check (Moyen)
- P-7 : bauxRoutes.ts — filterByOwner legacy (Moyen)
- P-8 : delegationRoutes.ts — isolation à vérifier (Moyen)
- P-9 : userAssignmentRoutes.ts — UPDATE sans vérification owner (Moyen)

### ✅ ACTION C-5 — taxRoutes.ts (IDOR req.params.ownerId)
**Fichier :** `backend/routes/taxRoutes.ts` + `frontend/src/api/financeApi.ts` + `frontend/src/pages/finance/FinanceTax.tsx`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été corrigé :**
- 3 routes IDOR corrigées : GET /settings/:ownerId, POST /settings, GET /report/:ownerId/:year
- ownerId retiré des params/body — résolu via tenantGuard+resolvedOwnerId
- pool.query() → dbClient.query() sur toutes les routes
- URLs backend modifiées : /settings (sans :ownerId), /report/:year (sans :ownerId)
- Frontend mis à jour : getTaxSettings(), getTaxReport(year) — ownerId retiré des appels
- FinanceTax.tsx : call sites corrigés

**Commit :** `fix(security): taxRoutes - IDOR ownerId params remplacé par tenantGuard+resolvedOwnerId (C-5)`

---

### ✅ ACTION P-4 — financeRoutes.ts (buildOwnerWhereClause + pool.query + IDOR)
**Fichier :** `backend/routes/financeRoutes.ts`
**Statut :** TERMINÉ
**Date :** 9 avril 2026

**Ce qui a été corrigé (9 routes) :**
- `GET /` : filterByOwner + buildOwnerWhereClause + pool.query → tenantGuard + dbClient + `WHERE p.owner_id = $1`
- `POST /` : pool.connect() transaction → dbClient.query BEGIN/COMMIT + vérif `leases.owner_id = resolvedOwnerId` avant INSERT
- `GET /stats` : aucun filtre owner → tenantGuard + `owner_id = $1` sur payments, expenses, payment_schedules
- `GET /stats/monthly` : buildOwnerWhereClause + pool.query → tenantGuard + dbClient + `owner_id = $1`
- `GET /stats/building/:id` : aucune vérif ownership → tenantGuard + check `buildings.owner_id = resolvedOwnerId` (404 si IDOR)
- `GET /export/excel` : buildOwnerWhereClause interpolée + pool.query → tenantGuard + dbClient + `p.owner_id = $1`
- `POST /generate-schedules` : inchangé (FinanceService utilise pool en interne — audit service séparé)
- `GET /schedules` : `ownerIds.join(',')` interpolé en SQL → tenantGuard + dbClient + `l.owner_id = $1` paramétré
- `PUT /schedules/:id/pay` : pool.connect() sans vérif ownership → dbClient BEGIN/COMMIT + `l.owner_id = $2` sur schedule lookup

**Éliminations :**
- Imports `filterByOwner`, `buildOwnerWhereClause`, `pool`, `dotenv` retirés
- receiptService.generateReceipt() déplacé APRÈS COMMIT (corrige bug: pool externe ne verrait pas les données non-committées)

**Commit :** `fix(security): financeRoutes - tenantGuard+RLS sur 8 routes, IDOR building/schedule/payment (P-4)`

### ⏳ ACTION P-5 — loanRoutes.ts (pas d'isolation tenant)
**Statut :** EN ATTENTE

### ⏳ ACTION P-6 — messageRoutes.ts
**Statut :** EN ATTENTE

### ⏳ ACTION P-7 — bauxRoutes.ts (filterByOwner legacy)
**Statut :** EN ATTENTE

### ⏳ ACTION P-8 — delegationRoutes.ts
**Statut :** EN ATTENTE

### ⏳ ACTION P-9 — userAssignmentRoutes.ts
**Statut :** EN ATTENTE

---

## RÈGLES D'ARCHITECTURE EN VIGUEUR

Voir `ARCHITECTURE_RULES.md` (à créer après les corrections critiques)

1. Toute requête vers une table métier passe par `req.dbClient` (tenantGuard)
2. `owner_id` vient UNIQUEMENT de `(req as any).resolvedOwnerId`
3. Jamais de `pool.query()` dans les routes gestionnaire
4. Ordre middleware : `protect → tenantGuard → multer → handler`
5. Services DB reçoivent `dbClient` en paramètre
6. Tout UPDATE/DELETE : 404 si `rowCount === 0`
