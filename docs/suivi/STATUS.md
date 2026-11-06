# État du projet — HopeGestionV2

> Dernière mise à jour : 2026-05-24

---

## Vue d'ensemble

HopeGestionV2 est une application SaaS de gestion immobilière (propriétaires, gestionnaires, locataires). Elle comprend un backend Express/TypeScript sur PostgreSQL et un frontend React/Tailwind. Le projet est déployé sur Render (backend) + DigitalOcean Spaces (fichiers).

---

## Architecture en place

| Couche | Technologie | État |
|--------|-------------|------|
| Backend | Express 5 + TypeScript | ✅ |
| Base de données | PostgreSQL + RLS | ✅ |
| Auth | JWT (15 min) + Refresh token (7 j, hashé en DB) | ✅ |
| Uploads | DigitalOcean Spaces (memoryStorage, fallback local dev) | ✅ |
| Rate limiting | 1000 req/15 min global · 20 req/15 min sur `/api/auth` | ✅ |
| Frontend | React + Vite + Tailwind CSS + DaisyUI | ✅ |
| Paiements | FedaPay + Mobile Money | ✅ |
| Notifications | Email (Nodemailer) + WhatsApp (Twilio) + In-app | ✅ |
| PDF / Excel | PDFKit + ExcelJS | ✅ |
| Planification | node-cron (loyers, alertes tâches/tickets) | ✅ |
| Documentation API | Swagger UI sur `/api/docs` | ✅ partielle |
| Tests | Jest + Supertest (4 fichiers) | ✅ minimal |

**Périmètre routes :** 42 fichiers de routes couvrant tous les modules métier.

---

## Ce qui a été fait (audit mai 2026)

Les 13 points du fichier `AMELIORATIONS.md` sont tous résolus :

| # | Problème | Résolution |
|---|----------|------------|
| 1 | Rate limiting désactivé | Réactivé, configuration par route |
| 2 | Assigné bloqué sur ses tâches | WHERE créateur OR assigné |
| 3 | `req.user.id` vs `req.userId` | Uniformisé sur `req.userId` |
| 4 | Pas de PUT notes/contacts | Routes ajoutées + DELETE contacts |
| 5 | Validation inputs absente | express-validator sur POST/PUT critiques |
| 6 | Uploads éphémères en prod | memoryStorage → Spaces systématique |
| 7 | AWS SDK v2 déprécié | Migré vers `@aws-sdk/client-s3` v3 |
| 8 | Pas de pagination | `backend/utils/pagination.ts` + 4 routes |
| 9 | Pas de refresh token | Access 15 min · Refresh 7 j · Auto-refresh 401 |
| 10 | Triple UI (MUI + Tailwind + DaisyUI) | MUI retiré, Tailwind + DaisyUI |
| 11 | WhatsAppService dead code | Branché sur CronService et messageRoutes |
| 12 | Pas de documentation API | Swagger monté, 13 endpoints documentés |
| 13 | Pas de tests | 4 fichiers Jest (auth, tasks, pagination, passwords) |

**Fixes récents (après audit) :**
- Finance : schedules visibles pour gestionnaire multi-owner (ANY au lieu de `= NULL`)
- Finance : `can_write = TRUE` pour génération des appels de loyer
- Finance : correction affichage des échéances
- Notifications : suppression des doublons "Bienvenue" créés à chaque déploiement
- Rate limit ajusté à 1000 req/15 min (200 était trop strict pour usage normal)
- UI : bouton "Modifier" masqué pour le propriétaire (protection des droits)

---

## Ce qui reste à faire

### Priorité haute

- [ ] **Étendre la validation des inputs** — `express-validator` n'est appliqué que sur `taskRoutes` et `notebookRoutes`. Les 40 autres fichiers de routes (finance, baux, locataires, EDL, dépenses…) n'ont pas de validation. Un champ malformé atteint directement PostgreSQL.

- [ ] **Corriger le décalage dans `AMELIORATIONS.md`** — Le corps de chaque item (lignes 73, 78, 100, 110, 117, 126) affiche encore `[ ]` alors que ces problèmes sont résolus. Seul le tableau récapitulatif est à jour. À nettoyer pour éviter la confusion.

### Priorité moyenne

- [ ] **Étendre la couverture de tests** — 4 fichiers de tests pour 42 routes, c'est insuffisant pour détecter des régressions. Priorité : `authRoutes`, `financeRoutes`, `rentPaymentRoutes`, `leaseRoutes`.

- [ ] **Compléter la documentation Swagger** — 13 endpoints documentés sur ~42 routes. Les modules finance, baux, EDL, paiements et locataires ne sont pas couverts.

- [ ] **Unifier le système UI** — MUI a été retiré mais Tailwind + DaisyUI coexistent. DaisyUI surcharge parfois les classes Tailwind. Choisir l'un ou l'autre éviterait des conflits de styles à terme.

- [ ] **Configurer les variables d'environnement en production** (si pas déjà fait) :
  - `SPACES_KEY`, `SPACES_SECRET`, `SPACES_ENDPOINT`, `SPACES_BUCKET`
  - `REFRESH_TOKEN_SECRET` (distinct de `JWT_SECRET`)
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`

### Priorité basse

- [ ] **Étendre la pagination** — L'utilitaire `pagination.ts` est en place mais appliqué sur seulement 4 routes (`tasks`, `providers`, `tickets`, `carnet/*`). Les routes `financeRoutes`, `documentRoutes`, `locataireRoutes` retournent encore toutes les lignes sans `LIMIT`.

- [ ] **CI/CD** — Vérifier que les workflows `.github/` incluent l'exécution des tests avant déploiement (`npm test`). Actuellement les 4 tests ne semblent pas bloquants dans le pipeline.

- [ ] **Audit de sécurité des routes publiques** — `publicRoutes.ts` est présent. S'assurer que les données exposées sans auth sont strictement en lecture seule et ne révèlent pas de données sensibles (RLS vérifié côté DB, mais à vérifier côté query).

---

## Variables d'environnement requises

```env
# Auth
JWT_SECRET=
REFRESH_TOKEN_SECRET=        # distinct du JWT_SECRET

# Base de données
DATABASE_URL=

# DigitalOcean Spaces
SPACES_KEY=
SPACES_SECRET=
SPACES_ENDPOINT=
SPACES_BUCKET=

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# FedaPay
FEDAPAY_SECRET_KEY=

# Email
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

## Commandes utiles

```bash
# Backend — démarrer en dev
cd backend && npm run dev

# Backend — lancer les tests
cd backend && npm test

# Frontend — démarrer en dev
cd frontend && npm run dev

# Backend — build production
cd backend && npm run build
```
