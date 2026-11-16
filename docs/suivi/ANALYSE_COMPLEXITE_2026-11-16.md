# Analyse de complexité — HopeGestion
**Date** : 2026-11-16 · **Périmètre** : code du dépôt (`main` après la PR #56) et comportement du serveur quand les données augmentent · **Méthode** : comptages sur le code ; serveur réel avec PostgreSQL 16 local, rempli à 3 échelles. Aucun fichier de code modifié.

## En bref
- **Le site tient la charge actuelle sans difficulté.** Serveur : 3 à 11 ms par appel.
- **Il tient encore à ×10** (450 immeubles, 1 350 lots, 1 000 locataires) : au plus 52 ms par appel.
- **À ×40** (1 800 immeubles, 5 400 lots), le serveur répond encore vite, mais **certaines listes deviennent lourdes**. Elles ne sont pas découpées en pages : tout est envoyé et affiché d'un coup.
- **Le premier problème apparaîtra sans nouveau client : la page Finances.** Elle charge et affiche *tous* les paiements depuis le début. Avec ~90 baux actifs, cela fait environ 1 000 paiements de plus par an.
- **Côté code**, le projet est gros (~78 000 lignes). Il porte trois dettes qui ralentissent les évolutions et favorisent les failles :
  - la logique métier est écrite directement dans les routes ;
  - les mêmes filtres de sécurité sont recopiés à de nombreux endroits ;
  - le frontend n'a aucun test.

---

## 1. Montée en charge (mesurée)

Compte gestionnaire avec tous les propriétaires. Médiane de 5 appels, serveur local. Les tailles sont celles **avant compression** ; nginx compresse ces réponses d'environ 20 à 25 fois.

| Appel (page) | ×1 = aujourd'hui (45 imm., 135 lots, 540 paiements) | ×10 | ×40 |
|---|---|---|---|
| `/biens/immeubles` (Biens) | 4 ms · 25 Ko | 12 ms · 253 Ko | 24 ms · 1,0 Mo |
| `/biens/lots` (Biens, Baux) | 5 ms · 63 Ko | 16 ms · 634 Ko | 51 ms · 2,6 Mo |
| `/locations` (Baux, Biens) | 5 ms · 64 Ko | 17 ms · 646 Ko | 59 ms · 2,6 Mo |
| `/locataires` (Locataires, Baux) | 8 ms · 67 Ko | 27 ms · 672 Ko | 131 ms · 2,7 Mo |
| `/compte/proprietaires` | 3 ms · 3 Ko | 23 ms · 29 Ko | 9 ms · 118 Ko |
| `/subscriptions/status` | 3 ms | 3 ms | 5 ms |
| **`/finances` (Transactions)** | 11 ms · **251 Ko** | 52 ms · **2,5 Mo** | 204 ms · **10,3 Mo** (520 Ko compressés) |
| `/alertes` | 8 ms | 17 ms | 164 ms |

**Lecture** :
- Les temps progressent à peu près en proportion des données (complexité linéaire). Aucune requête ne « s'emballe » : les index posés en T-099 (migration 066) font leur travail.
- La vraie limite est le **volume transféré puis affiché** : chaque liste renvoie *toutes* ses lignes. Compressées, les listes de ×40 pèsent ~100 Ko, ce qui reste acceptable. Mais le navigateur doit ensuite décoder et filtrer des milliers d'objets à chaque ouverture.

### Points de rupture, par ordre d'arrivée
1. **Transactions (`Finances.tsx`) : le premier à céder.**
   - Le serveur sait déjà découper en pages (`?page=&limit=`), mais l'écran ne s'en sert pas : il demande et **affiche toutes les lignes** dans un tableau.
   - Aujourd'hui : 540 lignes. À ~1 000 paiements de plus par an pour ~90 baux, cela fera plusieurs milliers de lignes dans 2 à 3 ans, ce qui rendra la page lente sur téléphone.
   - Correctif : pagination serveur (déjà prête) et écran par pages. **Effort : ½ jour.**
2. **`/alertes` : calcul refait à chaque appel.**
   - Il recalcule loyers en retard, baux à échéance et lots vacants (~160 ms à ×40). Il est raisonnable aujourd'hui (8 ms).
   - Correctif : cache de 1 minute par compte, comme le tableau de bord. **Effort : 1 h.**
3. **Listes Biens, Lots, Baux, Locataires, Propriétaires : tout est envoyé d'un coup.**
   - Le découpage en pages se fait seulement à l'écran. Ces listes restent confortables jusqu'à ~1 000 éléments ; au-delà, il faut paginer et filtrer côté serveur.
   - **Effort : 2 à 3 jours** pour les 5 listes : recherche et filtres à déplacer côté serveur, cache de pages à adapter.
4. **Pages qui ouvrent 4 à 6 listes complètes.**
   - Par exemple, Baux charge tous les lots, tous les locataires et tous les propriétaires… uniquement pour remplir les menus du formulaire.
   - Correctif : ne les charger qu'à l'ouverture du formulaire, ou proposer une recherche. **Effort : 1 jour.**

### Hors code
- **Serveur unique.** Le site, la base, nginx et les fichiers envoyés tournent sur un seul VPS, avec un processus Node unique (PM2, sans mode cluster).
  - Les requêtes lourdes (PDF, exports Excel) bloquent un instant toutes les autres.
  - La perte du serveur emporte tout : la perte des photos l'a montré.
  - Voir l'audit, F2 (sauvegardes) et F4 (déploiement).
- **Le cache en mémoire du serveur (`utils/cache.ts`) est propre au processus.** Si l'on passe un jour à plusieurs processus ou serveurs, il faudra un cache partagé (Redis), sans quoi les invalidations (propriétaires, permissions) ne seraient plus garanties.

---

## 2. Complexité du code (mesurée)

| Indicateur | Valeur |
|---|---|
| Taille | **~78 000 lignes** TypeScript : backend 23 800 lignes + 8 000 de tests ; frontend 46 600 |
| Surface | **272 routes** HTTP, **71 pages**, 81 composants |
| Tests | 339 tests backend (20 en échec, périmés), **aucun test frontend** |
| Typage | **535 `any`** côté backend, **232** côté frontend |
| Dépendances | backend 37 + 26 (dév.) ; frontend 23 + 21 (dév.) |

### Dettes principales
1. **Logique métier écrite dans les routes.**
   - 43 fichiers de routes sur 48 envoient eux-mêmes leurs requêtes SQL : **570 appels**, contre 155 dans les services.
   - Une règle métier (calcul d'un retard, d'un solde…) est donc souvent recopiée d'une route à l'autre. C'est là que naissent les incohérences, comme les colonnes mal nommées relevées en T-092.
2. **Filtres de sécurité recopiés.**
   - `scopeByOwner` est défini **12 fois** et `getEffectiveOwnerIds` **6 fois**, avec de petites variantes.
   - Chaque nouvelle route doit penser à le recopier. Les failles d'isolation entre agences de l'audit (S2) viennent de là.
   - Correctif : une fonction unique et testée. **Effort : 1 jour.**
3. **Appels réseau du frontend écrits à la main.**
   - **115 `fetch` manuels** (jeton ajouté à la main), contre 10 passages par l'utilitaire commun `apiCall`.
   - La gestion des erreurs et du renouvellement de session n'est donc pas uniforme.
4. **Fichiers très longs**, de 750 à 1 800 lignes :
   - backend : `runMigrations.ts` (1 791), `adminRoutes.ts` (1 123), `authRoutes.ts` (909), `edlRoutes.ts`, `compteRoutes.ts` ;
   - frontend : `ProprietaireForm.tsx` (958), `Interventions.tsx` (933), `CompteUtilisateurs.tsx`, `LocataireForm.tsx`, `LocationForm.tsx`, `LotForm.tsx`, `ImmeubleForm.tsx`, `Biens.tsx`, `Locations.tsx`.

   Les formulaires mélangent affichage, validation et appels réseau, et se ressemblent beaucoup entre eux.
5. **Doublons d'API.**
   - `/api/baux` et `/api/locations` exposent tous deux les baux ; `/api/depenses` et `/api/expenses` les dépenses ; `/api/paiements` et `/api/finances` les paiements.
   - Le site n'utilise que `locations`, `expenses` et `finances`. Les trois autres ne sont appelés ni par le site ni (sauf `paiements`) dans la doc mobile, mais doivent quand même être maintenus et sécurisés.
6. **Code mort** :
   - `backend/routes/UPLOAD_MIGRATION_EXAMPLE.ts`, un fichier d'exemple ;
   - `frontend/src/data/mockProperties.ts`, des données de démonstration encore utilisées par le carrousel public et le chatbot ;
   - de nombreux commentaires « RÉCAPITULATIF DES CORRECTIONS » en fin de fichiers.
7. **Dépendance à l'ordre des requêtes dans les tests.**
   - Les tests de routes simulent la base dans un ordre précis : tout changement interne (cache, requête combinée) les casse sans qu'il y ait de vrai bug (vu en T-092 et T-099).
   - C'est l'une des raisons des 20 tests périmés.

---

## 3. Recommandations, par ordre de rentabilité

| # | Action | Gain | Effort |
|---|---|---|---|
| 1 | Pagination de **Transactions** (serveur déjà prêt) | Évite le premier ralentissement prévisible | ½ j |
| 2 | **Filtre propriétaire unique** (`scopeByOwner` partagé et testé) | Sécurité : fin des oublis d'isolation | 1 j |
| 3 | Remettre les **20 tests périmés** au vert, puis les lancer avant chaque déploiement | Filet de sécurité retrouvé | 1 j |
| 4 | Cache 1 min sur `/alertes` | Requête la plus coûteuse à grande échelle | 1 h |
| 5 | Listes des formulaires chargées à la demande | Pages Baux et Biens plus légères | 1 j |
| 6 | Supprimer les API en double et le code mort | Moins de surface à maintenir et sécuriser | ½ j |
| 7 | Utilitaire réseau unique côté frontend (`apiCall` partout) | Erreurs et sessions gérées pareil partout | 2 j, progressif |
| 8 | Pagination serveur des 5 grandes listes | Prêt pour des agences de plusieurs milliers de lots | 2–3 j, quand un client dépassera ~1 000 lots |
| 9 | Découper les gros formulaires et sortir le SQL des routes vers des services | Évolutions plus sûres | Progressif, à chaque modification |

Les points 1 à 4 se font sans décision de votre part. Les points 8 et 9 sont à planifier selon la croissance.
