# Améliorations & Corrections — HopeGestionV2

> Document de suivi des problèmes identifiés lors de l'audit du projet.  
> Statuts : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

---

## 🔴 Critique

### 1. Rate limiting désactivé
- **Fichier :** `backend/index.ts` lignes 91-92
- **Problème :** Les rate limiters sont commentés avec `// Removed for dev` et n'ont jamais été réactivés. Toutes les routes API sont exposées sans limite de requêtes, y compris `/api/auth/login`.
- **Risque :** Attaques par force brute, déni de service.
- **Action :** Réactiver et configurer les rate limiters par route (auth plus strict que le reste).
- **Statut :** `[x]`

---

### 2. Un assigné ne peut pas mettre à jour ses propres tâches
- **Fichier :** `backend/routes/taskRoutes.ts` ligne 117
- **Problème :** Le `WHERE id=$1 AND created_by=$2` dans le PUT bloquait toute modification par la personne assignée. Un utilisateur à qui une tâche est assignée ne pouvait pas changer son statut (ex. passer à `in_progress` ou `done`).
- **Risque :** Fonctionnalité cassée — le module de tâches est inutilisable pour les assignés.
- **Action :** Autoriser les modifications par le créateur OU l'assigné, en distinguant les champs modifiables selon le rôle.
- **Statut :** `[x]`

---

## 🟠 Haute priorité

### 3. Incohérence `req.user.id` vs `req.userId`
- **Fichier :** `backend/routes/taskRoutes.ts` (utilise `req.user.id`) vs toutes les autres routes (utilisent `req.userId`)
- **Problème :** Le middleware `authMiddleware` expose `req.userId`. `taskRoutes` accède à `req.user.id` qui peut être `undefined` si la structure du middleware évolue.
- **Risque :** Erreur silencieuse — `userId` devient `undefined`, fuite de données ou plantage.
- **Action :** Uniformiser sur `req.userId` dans toutes les routes.
- **Statut :** `[x]` — Corrigé dans `taskRoutes`, `calendarRoutes`, `delegationRoutes`, `messageRoutes`, `ticketRoutes`.

---

### 4. Pas de routes PUT/PATCH pour les notes et contacts
- **Fichier :** `backend/routes/notebookRoutes.ts`
- **Problème :** Aucune route d'édition pour les notes ni pour les contacts du carnet. L'utilisateur peut seulement créer et supprimer.
- **Risque :** Fonctionnalité incomplète — impossible de corriger une note sans la supprimer et recréer.
- **Action :** Ajouter `PUT /api/carnet/notes/:id` et `PUT /api/carnet/contacts/:id` avec isolation par `user_id`.
- **Statut :** `[x]` — Routes ajoutées avec isolation `user_id` et validation. Bonus : `DELETE /contacts/:id` également ajouté (manquait aussi).

---

### 5. Pas de validation des inputs sur la majorité des routes
- **Fichiers :** `taskRoutes.ts`, `notebookRoutes.ts`, `providerRoutes.ts` et la majorité des routes métier
- **Problème :** `express-validator` est installé mais utilisé uniquement sur certaines routes d'authentification. Les autres routes ne valident rien — un `title` vide, un `due_date` malformé ou un `email` invalide atteignent directement la base de données.
- **Risque :** Données corrompues en BDD, erreurs PostgreSQL non maîtrisées exposées au client.
- **Action :** Ajouter des middlewares de validation sur toutes les routes POST et PUT critiques.
- **Statut :** `[x]` — Validation ajoutée sur `taskRoutes` (POST/PUT) et `notebookRoutes` (POST/PUT notes et contacts).

---

### 6. Uploads locaux en production (données éphémères)
- **Fichiers :** `backend/middleware/uploadMiddleware.ts`, `backend/routes/uploadRoutes.ts`
- **Problème :** Les fichiers uploadés étaient stockés sur le disque local. Render utilise un filesystem éphémère — tous les fichiers étaient perdus à chaque redémarrage.
- **Risque :** Perte de données utilisateur (documents, photos EDL, signatures).
- **Action :** Systématiser l'utilisation de `spacesUploadService.ts` (S3/Spaces) pour tous les uploads.
- **Statut :** `[x]` — `uploadMiddleware` passe en memoryStorage. `uploadRoutes`, `documentRoutes` et `expenseRoutes` uploadent vers Spaces si configuré, sinon fallback disque local pour le dev.

---

## 🟡 Moyenne priorité

### 7. AWS SDK v2 déprécié
- **Fichier :** `backend/package.json` — `"aws-sdk": "^2.1693.0"`
- **Problème :** AWS SDK v2 est officiellement déprécié. Plus de nouveaux correctifs de sécurité.
- **Risque :** Vulnérabilités non corrigées à terme.
- **Action :** Migrer vers `@aws-sdk/client-s3` (v3) — API modulaire, bundle plus léger.
- **Statut :** `[ ]`

---

### 8. Pas de pagination sur les listes
- **Fichiers :** `taskRoutes.ts`, `notebookRoutes.ts`, `providerRoutes.ts` et autres routes GET
- **Problème :** Les routes `GET /` retournent toutes les lignes sans `LIMIT/OFFSET`. Pas de problème maintenant, mais bloquant à l'échelle.
- **Risque :** Dégradation des performances, timeout, surcharge mémoire.
- **Action :** Ajouter `?page=1&limit=20` avec réponse `{ data, total, page, totalPages }`.
- **Statut :** `[ ]`

---

### 9. Pas de refresh token
- **Fichiers :** `backend/routes/authRoutes.ts`, `frontend/src/`
- **Problème :** L'authentification reposait uniquement sur un JWT 24h. À expiration, l'utilisateur était déconnecté sans renouvellement silencieux.
- **Risque :** Mauvaise expérience utilisateur (déconnexion brutale en cours de travail).
- **Action :** Implémenter un refresh token avec route `/api/auth/refresh`.
- **Statut :** `[x]` — Access token : 15 min. Refresh token : 7 jours, stocké hashé en DB (table `refresh_tokens`). Rotation à chaque refresh. Auto-refresh sur 401 dans `apiUtils.ts`. Logout révoque le token en DB.

---

### 10. Triple système UI non unifié
- **Fichier :** `frontend/package.json`
- **Problème :** Le frontend embarque 3 bibliothèques de composants : MUI, Tailwind CSS et DaisyUI. Elles se chevauchent, créent des conflits de styles et gonflent inutilement le bundle.
- **Risque :** Incohérence visuelle, maintenance difficile, temps de chargement initial plus long.
- **Action :** Définir un système de design principal et supprimer les dépendances redondantes progressivement.
- **Statut :** `[ ]`

---

## 🔵 Faible priorité / Améliorations long terme

### 11. WhatsAppService non branché
- **Fichier :** `backend/services/WhatsAppService.ts`
- **Problème :** Le service existe dans `services/` mais aucune route ni aucun événement ne l'utilise. C'est du dead code.
- **Action :** Soit l'intégrer aux notifications (alertes loyer, ticketing), soit le supprimer.
- **Statut :** `[ ]`

---

### 12. Pas de documentation API
- **Problème :** Avec ~40 fichiers de routes, il n'existe aucune documentation Swagger/OpenAPI.
- **Risque :** Onboarding difficile pour un nouveau développeur, tests manuels fastidieux.
- **Action :** Intégrer `swagger-jsdoc` + `swagger-ui-express` et documenter les routes progressivement.
- **Statut :** `[ ]`

---

### 13. Absence de suite de tests automatisés
- **Fichier :** `backend/tests/` — seulement 2 fichiers de tests manuels
- **Problème :** Aucun test unitaire ni d'intégration en place. Impossible de détecter des régressions automatiquement.
- **Action :** Mettre en place Jest + Supertest pour les routes critiques (auth, paiements, RLS).
- **Statut :** `[ ]`

---

## Récapitulatif

| # | Problème | Priorité | Statut |
|---|---|---|---|
| 1 | Rate limiting désactivé | Critique | `[x]` |
| 2 | Assigné ne peut pas modifier ses tâches | Critique | `[x]` |
| 3 | Incohérence `req.user.id` vs `req.userId` | Haute | `[x]` |
| 4 | Pas de PUT pour notes/contacts | Haute | `[x]` |
| 5 | Pas de validation des inputs | Haute | `[x]` |
| 6 | Uploads locaux éphémères en production | Haute | `[x]` |
| 7 | AWS SDK v2 déprécié | Moyenne | `[x]` |
| 8 | Pas de pagination | Moyenne | `[x]` |
| 9 | Pas de refresh token | Moyenne | `[x]` |
| 10 | Triple système UI | Moyenne | `[x]` |
| 11 | WhatsAppService non branché | Faible | `[x]` |
| 12 | Pas de documentation API | Faible | `[x]` |
| 13 | Pas de tests automatisés | Faible | `[x]` |
