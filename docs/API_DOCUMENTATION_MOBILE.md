# 📱 Guide d'Intégration API & Spécification Mobile — HopeGestionV2

> Ce document constitue la référence technique officielle pour le développement de l'**application mobile HopeGestion** hébergée dans son dépôt distant. Il décrit l'ensemble des endpoints, formats de requêtes/réponses, protocoles d'authentification et structures de données nécessaires au fonctionnement de l'application mobile avec le backend HopeGestionV2.

---

## Sommaire

1. [Architecture & Environnements](#1-architecture--environnements)
2. [Authentification & Cycle de Vie des Tokens](#2-authentification--cycle-de-vie-des-tokens)
3. [Multi-Tenancy & Rôles Utilisateurs](#3-multi-tenancy--rôles-utilisateurs)
4. [Gestion du Profil Utilisateur](#4-gestion-du-profil-utilisateur)
5. [Tableau de Bord & Indicateurs Clés (KPIs)](#5-tableau-de-bord--indicateurs-clés-kpis)
6. [Gestion des Biens & Lots Immobiliers](#6-gestion-des-biens--lots-immobiliers)
7. [Gestion des Locataires & Baux](#7-gestion-des-locataires--baux)
8. [Finances, Paiements & Mobile Money](#8-finances-paiements--mobile-money)
9. [Interventions & Tickets (Terrain)](#9-interventions--tickets-terrain)
10. [Alertes & Notifications Push](#10-alertes--notifications-push)
11. [Téléversement de Photos & Documents (S3 Spaces)](#11-téléversement-de-photos--documents-s3-spaces)
12. [Types TypeScript Canoniques (Source de Vérité)](#12-types-typescript-canoniques-source-de-vérité)
13. [Exemple de Client HTTP Isomorphe (Axios / Fetch + Refresh Automatique)](#13-exemple-de-client-http-isomorphe-axios--fetch--refresh-automatique)

---

## 1. Architecture & Environnements

Le backend HopeGestionV2 expose une API RESTful JSON.

### URLs de Base

| Environnement | Base URL | Usage |
|---|---|---|
| **Développement Local (Émulateur Android)** | `http://10.0.2.2:5001/api` | Émulateur Android Studio vers localhost |
| **Développement Local (Simulateur iOS / Web)** | `http://localhost:5001/api` | Simulateur iOS ou navigateur web |
| **Développement Local (Appareil Physique Expo)** | `http://<IP_LOCALE_MACHINE>:5001/api` | Test WiFi sur smartphone physique |
| **Production (Serveur Cloud)** | `https://hopegestion.com/api` | API de production déployée |

### En-têtes HTTP Requis

Toutes les requêtes (sauf login, register, forgot-password) doivent obligatoirement fournir :
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Devise & Spécificités Régionales
- **Zone géographique cible** : Afrique de l'Ouest (Bénin, zone UEMOA).
- **Devise monétaire** : **FCFA / XOF** (montants entiers sans décimales, ex: `150000`).
- **Format téléphone** : Format international avec indicatif pays par défaut `+229` (Bénin).

---

## 2. Authentification & Cycle de Vie des Tokens

Le mobile utilise un ensemble d'endpoints **dédiés** (`/api/auth/mobile/*`), distincts des endpoints web (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`). Ces derniers reposent sur un cookie `httpOnly` que le mobile ne peut ni lire ni renvoyer : ils sont **inutilisables** depuis l'application mobile, et réciproquement un token émis pour le mobile est refusé par les routes web.

* **Access Token (JWT)** : durée de vie **15 minutes**. Transmis dans le header `Authorization: Bearer <token>` sur chaque requête protégée.
* **Refresh Token** : durée de vie **7 jours**. Chaîne hexadécimale de **80 caractères** (40 octets aléatoires), hashée en SHA-256 côté serveur. Renvoyé dans le corps JSON — jamais en cookie — et doit être stocké côté mobile via `flutter_secure_storage` uniquement (Keychain sur iOS, Keystore sur Android).
* **Rotation à chaque refresh** : chaque appel à `/mobile/refresh` invalide immédiatement l'ancien refresh token et en émet un nouveau. Réutiliser un refresh token déjà consommé renvoie systématiquement `401`.

> ⚠️ **Contrainte critique** : ne jamais envoyer d'en-tête `Origin` vers `/api/auth/mobile/*`. Toute requête qui en porte un — quelle que soit sa valeur, y compris `"null"` — est rejetée en `403` avant même d'atteindre la logique métier (garde CORS dédiée, voir `ARCHITECTURE_RULES.md` § 4). Les clients HTTP natifs (`dio`, `http`) n'ajoutent pas cet en-tête par défaut : ne le configurez pas manuellement. Conséquence directe : ces endpoints ne sont **pas utilisables depuis un navigateur**, donc pas depuis **Flutter Web** — un navigateur envoie systématiquement `Origin` sur ce type de requête.

### 2.1 Connexion (`POST /api/auth/mobile/login`)

**Requête :**
```http
POST /api/auth/mobile/login HTTP/1.1
Content-Type: application/json

{
  "email": "gestionnaire@example.com",
  "password": "MonMotDePasseSecurise1!"
}
```

**Réponse (200 OK) :**
```json
{
  "message": "Connexion réussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "7a8f9e0b1c2d3e4f5a6b7c8d9e0f1a2b... (80 caractères hex)",
  "role": "gestionnaire",
  "userId": 42
}
```
Aucun cookie n'est posé, et aucun objet `user` détaillé n'est renvoyé ici : appelez ensuite `GET /api/auth/profile` avec l'access token pour récupérer le profil complet.

**Erreurs possibles :**
| Code | Corps | Cas |
|---|---|---|
| `400` | `{ "errors": [...] }` (voir 2.5) | Email/mot de passe manquant, ou email au format invalide |
| `401` | `{ "message": "Email ou mot de passe incorrect." }` | Identifiants invalides |
| `401` | `{ "message": "Votre compte est inactif ou suspendu..." }` | Compte désactivé |
| `403` | `{ "message": "Veuillez vérifier votre adresse email...", "isVerified": false }` | Email non vérifié — voir 2.4 |
| `403` | `{ "message": "Origine non autorisée." }` | En-tête `Origin` présent |
| `429` | `{ "error": "Trop de tentatives de connexion, réessayez dans 15 minutes." }` | Quota `authLimiter` dépassé — voir encadré ci-dessous |

> **Limitation de débit (`authLimiter`)** : `/mobile/login`, `/mobile/refresh` et `/mobile/logout` partagent le même quota que **tout** `/api/auth/*` (y compris les routes web) : **20 requêtes / 15 minutes par IP**, avec `skipSuccessfulRequests: true` — seules les requêtes qui échouent consomment le quota. Réponse `429`, corps `{ "error": "..." }` (et non `{ "message": ... }`, à distinguer des erreurs 401/403). Des en-têtes `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` sont présents sur chaque réponse.

### 2.2 Rafraîchissement (`POST /api/auth/mobile/refresh`)

Sur toute réponse `401` d'un endpoint protégé, rafraîchissez avant de rejouer la requête originale.

**Requête :**
```http
POST /api/auth/mobile/refresh HTTP/1.1
Content-Type: application/json

{
  "refreshToken": "7a8f9e0b1c2d3e4f5a6b7c8d9e0f1a2b..."
}
```

**Réponse (200 OK) :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(nouveau)",
  "refreshToken": "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e...(nouveau, tournant)"
}
```
> Pas de champ `message` sur cette réponse, contrairement à `/mobile/login`.

**Erreurs possibles :**
| Code | Corps | Cas |
|---|---|---|
| `400` | `{ "errors": [{ "msg": "Refresh token manquant.", ... }] }` | `refreshToken` absent du corps |
| `400` | `{ "errors": [{ "msg": "Refresh token invalide.", ... }] }` | Format incorrect (pas 80 caractères hex minuscules) |
| `401` | `{ "message": "Refresh token invalide ou expiré." }` | Token révoqué, expiré, déjà consommé (rotation), ou émis pour l'autre canal (web) |
| `403` | `{ "message": "Origine non autorisée." }` | En-tête `Origin` présent |
| `429` | `{ "error": "Trop de tentatives de connexion, réessayez dans 15 minutes." }` | Quota `authLimiter` dépassé (voir § 2.1) |

Un token émis par `/mobile/login` ne peut être rafraîchi que via `/mobile/refresh` — jamais via `/api/auth/refresh` (web), et inversement. Le message d'erreur `401` est volontairement identique dans tous les cas d'échec, pour ne donner aucun indice distinctif à un attaquant.

### 2.3 Déconnexion (`POST /api/auth/mobile/logout`)

```http
POST /api/auth/mobile/logout HTTP/1.1
Content-Type: application/json

{ "refreshToken": "..." }
```
**Réponse (200 OK) :** `{ "message": "Déconnexion réussie." }` — toujours `200`, même si le token était déjà invalide, révoqué ou absent en base. Effacez les tokens stockés localement immédiatement après l'appel, sans dépendre du résultat.

### 2.4 Vérification d'Email

Il n'existe **pas** de `/api/auth/mobile/verify-email`. Le flux est :
1. Appelez `POST /api/auth/verify-email` (`{ "email", "otp" }`) — c'est un endpoint **web**, partagé : sa réponse contient un `token` d'accès et pose un cookie `refreshToken` (canal `web`). Ce token d'accès est valide 15 minutes mais aucun refresh token mobile ne lui est associé : la session ne pourrait pas être prolongée. Ignorez-le et appelez `/mobile/login`.
2. Appelez immédiatement `POST /api/auth/mobile/login` avec les mêmes identifiants pour obtenir la première paire de tokens du canal mobile.

### 2.5 Formats d'Erreur

Deux formes selon l'origine de l'erreur — à distinguer côté Flutter en testant la présence de `errors` (tableau) vs `message` (chaîne) :

* **Erreurs de validation (`400`)**, produites par `express-validator` :
  ```json
  { "errors": [ { "type": "field", "msg": "...", "path": "refreshToken", "location": "body", "value": "..." } ] }
  ```
  Le champ `value` est **absent** quand le champ manquait entièrement dans la requête ; il n'apparaît que si une valeur invalide a été fournie.
* **Erreurs métier/auth (`401`, `403`, `404`, `409`, ...)** :
  ```json
  { "message": "Texte lisible pour l'utilisateur." }
  ```
  Parfois enrichi de champs additionnels (ex. `isVerified` sur le `403` de `/mobile/login`).

### 2.6 Recommandations d'Implémentation Flutter

* **Stockage** : access token et refresh token **uniquement** via `flutter_secure_storage`. Jamais dans `SharedPreferences`, un provider en mémoire persistant sans chiffrement, ou un log.
* **Intercepteur `dio`** : sur une réponse `401`, déclenchez un refresh puis rejouez la requête initiale. À cause de la rotation (2.2), **deux refresh concurrents invalident mutuellement leurs tokens et cassent la session** — protégez l'appel à `/mobile/refresh` par un verrou (`Completer`/mutex) ou une file d'attente partagée, de sorte qu'**un seul refresh soit en vol à la fois** ; les requêtes qui échouent en `401` pendant qu'un refresh est déjà en cours doivent attendre son résultat puis rejouer avec le nouveau token, sans déclencher leur propre refresh.
* **Échec du refresh (`401`)** : effacez immédiatement les tokens stockés et redirigez vers l'écran de connexion — ne retentez pas.
* **Quota dépassé pendant un refresh (`429`)** : ce n'est **pas** un échec d'authentification — ne pas effacer les tokens ni déconnecter l'utilisateur. Attendez (voir `RateLimit-Reset`) puis réessayez plus tard.
* **Après vérification d'email** : suivez le flux 2.4 (`verify-email` puis `mobile/login`).
* **Aucun cookie jar** (`CookieManager`/`PersistCookieJar`) ne doit être attaché au client `dio` utilisé pour `/api/auth/mobile/*` : ces endpoints n'utilisent pas de cookies, et un cookie jar stockerait inutilement le cookie `refreshToken` web posé par `verify-email` (2.4).

### 2.7 Limites Connues (Hors Périmètre Actuel)

* **Pas de révocation automatique** des refresh tokens actifs lors d'un changement de mot de passe (`/api/auth/change-password`) ou d'une réinitialisation (`/api/auth/reset-password`) — un ancien refresh token mobile reste valide après un changement de mot de passe.
* **Pas de détection de réutilisation (reuse detection)** : présenter un refresh token déjà révoqué échoue simplement en `401`, sans invalider les autres sessions actives de l'utilisateur.
* **Pas de purge automatique** des refresh tokens expirés en base.

Ces points sont identifiés et prévus pour un chantier ultérieur séparé.

### 2.8 Mot de Passe Oublié & Réinitialisation

Ces endpoints sont partagés entre web et mobile (pas de notion de canal) :

1. **Demande d'envoi du code** :
   ```http
   POST /api/auth/forgot-password
   Content-Type: application/json

   { "email": "gestionnaire@example.com" }
   ```
   Réponse toujours `200` (anti-énumération), que l'email existe ou non.
2. **Réinitialisation effective** :
   ```http
   POST /api/auth/reset-password
   Content-Type: application/json

   { "token": "...", "newPassword": "NouveauMotDePasse1!" }
   ```
   Le token est transmis dans le **corps**, pas dans l'URL ; le champ s'appelle `newPassword`, pas `password`.

---

## 3. Multi-Tenancy & Rôles Utilisateurs

Le backend implémente une isolation stricte des données par **PostgreSQL Row Level Security (RLS)** :
* **`gestionnaire`** : Accès complet à son agence (création de biens, baux, finances, encaissements, prestataires, tickets).
* **`proprietaire`** : Accès filtré en lecture à son propre patrimoine (immeubles délégués, locataires de ses lots, loyers perçus, reddition des comptes).
* **`locataire`** : Accès exclusivement restreint à son propre bail, ses quittances et le paiement de son loyer.

> Le client mobile n'a pas besoin de passer manuellement d'`agency_id` ou `owner_id` : le token JWT injecte le contexte utilisateur (`req.userId`), et le backend applique automatiquement le cloisonnement RLS.

---

## 4. Gestion du Profil Utilisateur

### Obtenir son profil
```http
GET /api/compte/profile
Authorization: Bearer <token>
```
*Réponse (200) :* Renvoie l'objet utilisateur avec ses coordonnées et ses préférences.

### Mettre à jour son profil
```http
PUT /api/compte/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Waris Agence Pro",
  "telephone": "+22997112233",
  "avatar_url": "https://.../nouvel_avatar.jpg"
}
```

### Modifier son mot de passe
```http
PUT /api/compte/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "AncienMotDePasse1!",
  "newPassword": "NouveauMotDePasseFort2@"
}
```

---

## 5. Tableau de Bord & Indicateurs Clés (KPIs)

### Obtenir les indicateurs de synthèse (`GET /api/dashboard/stats`)

Permet de charger les données synthétiques de la page d'accueil mobile en un seul appel réseau.

```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Exemple de réponse (200 OK) :**
```json
{
  "totalRevenus": 2450000,
  "totalDepenses": 320000,
  "revenuNet": 2130000,
  "tauxOccupation": 92.5,
  "totalLots": 24,
  "lotsOccupes": 22,
  "lotsDisponibles": 2,
  "loyersEnAttente": 180000,
  "loyersEnRetard": 75000,
  "ticketsOuverts": 3,
  "bauxExpirantBientot": 2,
  "derniersPaiements": [
    {
      "id": 108,
      "locataire": "Jean Kossi",
      "lot": "Appartement B2",
      "montant": 120000,
      "date": "2026-09-10",
      "statut": "valide",
      "mode": "Mobile Money"
    }
  ]
}
```

---

## 6. Gestion des Biens & Lots Immobiliers

### 6.1 Immeubles (`/api/biens`)

* **Lister les immeubles** :
  ```http
  GET /api/biens?page=1&limit=20&ville=Cotonou&statut=actif
  ```
  *Réponse :* Structure paginée `{ "data": [ ...Immeuble ], "total": 12, "page": 1, "limit": 20 }`.
* **Consulter un immeuble** :
  ```http
  GET /api/biens/:id
  ```
  *Réponse :* Données détaillées de l'immeuble (adresse, quartier, ville, photos, nombre d'étages, description).
* **Créer un immeuble** :
  ```http
  POST /api/biens
  Content-Type: application/json

  {
    "nom": "Résidence La Paix",
    "type": "Immeuble",
    "adresse": "Boulevard de la Marina",
    "quartier": "Haie Vive",
    "ville": "Cotonou",
    "pays": "Bénin",
    "description": "Immeuble R+3 de standing avec parking",
    "photos": ["https://.../photo1.jpg", "https://.../photo2.jpg"]
  }
  ```
* **Mettre à jour un bien** : `PUT /api/biens/:id`
* **Supprimer un bien** (mise à la corbeille) : `DELETE /api/biens/:id`

### 6.2 Lots / Logements (`/api/biens/:immeubleId/lots`)

* **Lister les lots d'un immeuble** :
  ```http
  GET /api/biens/:immeubleId/lots
  ```
* **Ajouter un lot dans un immeuble** :
  ```http
  POST /api/biens/:immeubleId/lots
  Content-Type: application/json

  {
    "ref_lot": "A102",
    "type": "Appartement",
    "etage": "1er étage",
    "surface": 85.5,
    "nb_pieces": 3,
    "loyer_mensuel": 150000,
    "charges_mensuelles": 15000,
    "statut": "disponible",
    "description": "Appartement moderne climatisé avec balcon"
  }
  ```
* **Mettre à jour un lot** : `PUT /api/biens/lots/:lotId`
* **Supprimer un lot** : `DELETE /api/biens/lots/:lotId`

---

## 7. Gestion des Locataires & Baux

### 7.1 Locataires (`/api/locataires`)

* **Lister les locataires** :
  ```http
  GET /api/locataires?page=1&limit=20&search=Kossi
  ```
* **Détail d'un locataire (avec ses baux et historique)** :
  ```http
  GET /api/locataires/:id
  ```
* **Ajouter un locataire** :
  ```http
  POST /api/locataires
  Content-Type: application/json

  {
    "nom": "Mensah",
    "prenoms": "Koffi Eric",
    "email": "koffi.mensah@example.com",
    "telephone_principal": "+22997887766",
    "telephone_secondaire": "+22995443322",
    "type_piece": "CIP",
    "numero_piece": "0123456789",
    "nationalite": "Béninoise",
    "type": "Locataire"
  }
  ```
* **Mettre à jour un locataire** : `PUT /api/locataires/:id`
* **Valider ou Rejeter une candidature locataire** :
  - Validation : `PUT /api/locataires/:id/approve`
  - Rejet : `PUT /api/locataires/:id/reject`

### 7.2 Baux / Contrats de Location (`/api/locations`)

* **Lister les baux actifs** : `GET /api/locations?statut=actif`
* **Créer un contrat de bail** :
  ```http
  POST /api/locations
  Content-Type: application/json

  {
    "lot_id": 14,
    "tenant_id": 5,
    "date_debut": "2026-10-01",
    "date_fin": "2027-09-30",
    "loyer_actuel": 150000,
    "caution_versee": 300000,
    "avance_versee": 150000,
    "jour_echeance": 5
  }
  ```

---

## 8. Finances, Paiements & Mobile Money

### 8.1 Statistiques Financières
```http
GET /api/finances/stats
```
*Réponse :* Montant total des loyers perçus, loyers impayés, charges décaissées sur le mois en cours.

### 8.2 Enregistrement Manuel d'un Paiement
Utilisé sur le terrain par le gestionnaire pour enregistrer un paiement en liquide, chèque ou virement :
```http
POST /api/paiements
Content-Type: application/json

{
  "lease_id": 8,
  "montant": 150000,
  "date_paiement": "2026-09-15",
  "type": "Loyer",
  "mode_paiement": "Especes",
  "reference_transaction": "RECU-ESPECE-0926"
}
```
*Réponse :* Enregistre le paiement et génère automatiquement l'URL de la quittance PDF associée.

### 8.3 Initialisation d'un Paiement Mobile Money (FedaPay)
Pour le portail locataire sur mobile :
```http
POST /api/mobile-money/initiate
Content-Type: application/json

{
  "lease_id": 8,
  "montant": 150000,
  "network": "MTN", // ou "MOOV"
  "telephone": "+22997001122"
}
```
*Réponse :* Renvoie l'URL de paiement ou la transaction FedaPay en attente de validation push USSD sur le téléphone du client.

---

## 9. Interventions & Tickets (Terrain)

Idéal pour l'usage mobile : signalement d'un sinistre, d'une fuite d'eau ou d'une panne avec photos prises directement sur place.

### 9.1 Lister les tickets d'intervention
```http
GET /api/tickets?statut=ouvert&priorite=haute
```

### 9.2 Créer un ticket depuis le smartphone
```http
POST /api/tickets
Content-Type: application/json

{
  "lot_id": 14,
  "tenant_id": 5,
  "titre": "Fuite d'eau sous l'évier de la cuisine",
  "description": "Le tuyau d'évacuation est percé, infiltration visible.",
  "priorite": "haute",
  "photos": [
    "https://.../spaces/fuite_1.jpg",
    "https://.../spaces/fuite_2.jpg"
  ]
}
```

### 9.3 Mettre à jour le statut d'un ticket
```http
PUT /api/tickets/:id/status
Content-Type: application/json

{
  "statut": "en_cours" // 'ouvert' | 'en_cours' | 'resolu' | 'ferme'
}
```

### 9.4 Ajouter un commentaire de suivi
```http
POST /api/tickets/:id/comments
Content-Type: application/json

{
  "commentaire": "Plombier contacté, intervention prévue demain matin à 9h."
}
```

### 9.5 Annuaire des prestataires
```http
GET /api/providers
```
*Réponse :* Liste des artisans référencés (plomberie, électricité, menuiserie, peinture) avec contact direct.

---

## 10. Alertes & Notifications Push

### 10.1 Enregistrement du Token Push Mobile

Au démarrage de l'app mobile (après autorisation utilisateur avec `expo-notifications`), le mobile transmet son push token au backend :

```http
POST /api/notifications/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "android", // ou "ios"
  "deviceName": "Samsung Galaxy S22"
}
```

### 10.2 Désenregistrement (Déconnexion)
Lors de la déconnexion de l'utilisateur sur le mobile :
```http
DELETE /api/notifications/devices/:token
```

### 10.3 Alertes In-App
* **Lister les alertes :** `GET /api/alertes`
* **Marquer une alerte comme lue :** `PUT /api/alertes/:id/read`
* **Marquer tout comme lu :** `PUT /api/alertes/read-all`

---

## 11. Téléversement de Photos & Documents (S3 Spaces)

L'API dispose d'un endpoint optimisé pour l'upload de médias depuis la caméra ou la galerie du smartphone. Les fichiers sont vérifiés (magic bytes) et hébergés sur **DigitalOcean Spaces (compatible AWS S3)**.

### Requête Upload
```http
POST /api/upload HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="photo_lot.jpg"
Content-Type: image/jpeg

<Données binaires de l'image>
------WebKitFormBoundaryXYZ--
```

### Réponse (200 OK)
```json
{
  "url": "https://hopegestion.ams3.digitaloceanspaces.com/uploads/2026/09/a8f1b2c3-photo_lot.jpg",
  "filename": "a8f1b2c3-photo_lot.jpg",
  "mimetype": "image/jpeg",
  "size": 1542000
}
```

---

## 12. Types TypeScript Canoniques (Source de Vérité)

Vous pouvez copier directement ce fichier dans votre nouveau dépôt mobile (ex: `src/types/index.ts`) :

```typescript
// src/types/index.ts

export type UserRole = 'gestionnaire' | 'proprietaire' | 'locataire' | 'admin';

export interface UserProfile {
  id: number;
  nom: string;
  email: string;
  user_type: UserRole;
  role: UserRole;
  telephone: string;
  avatar_url?: string;
  statut: 'actif' | 'inactif' | 'suspendu';
}

export interface Immeuble {
  id: number;
  nom: string;
  type: string;
  adresse: string;
  ville: string;
  pays: string;
  quartier?: string;
  nbLots?: number;
  occupation?: number;
  statut?: string;
  photos?: string[];
  description?: string;
}

export interface Lot {
  id: number;
  building_id: number;
  ref_lot: string;
  type: 'Appartement' | 'Studio' | 'Boutique' | 'Bureau' | string;
  etage?: string;
  surface?: number;
  nb_pieces?: number;
  loyer_mensuel: number;
  charges_mensuelles?: number;
  statut: 'disponible' | 'occupe' | 'travaux' | 'reserve';
  description?: string;
  photos?: string[];
}

export interface Locataire {
  id: number;
  nom: string;
  prenoms: string;
  email?: string;
  telephone_principal: string;
  telephone_secondaire?: string;
  type_piece?: string;
  numero_piece?: string;
  nationalite?: string;
  statut: 'Actif' | 'Inactif' | 'En attente';
  loyer_total?: number;
}

export interface Ticket {
  id: number;
  lot_id: number;
  tenant_id?: number;
  titre: string;
  description: string;
  priorite: 'basse' | 'moyenne' | 'haute' | 'urgence';
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  photos?: string[];
  date_creation: string;
  date_resolution?: string;
}

export interface Paiement {
  id: number;
  lease_id: number;
  montant: number;
  date_paiement: string;
  type: 'Loyer' | 'Caution' | 'Charges' | 'Avance';
  mode_paiement: 'Mobile Money' | 'Especes' | 'Virement' | 'Cheque';
  reference_transaction?: string;
  statut: 'valide' | 'en_attente' | 'annule';
  quittance_url?: string;
}

export interface AlertItem {
  id: number;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DashboardKPIs {
  totalRevenus: number;
  totalDepenses: number;
  revenuNet: number;
  tauxOccupation: number;
  totalLots: number;
  lotsOccupes: number;
  lotsDisponibles: number;
  loyersEnAttente: number;
  loyersEnRetard: number;
  ticketsOuverts: number;
}
```

---

## 13. Exemple de Client HTTP Isomorphe (Axios / Fetch + Refresh Automatique)

> Exemple obsolète supprimé. Voir la section 2 pour le contrat d'authentification mobile ; un exemple d'intercepteur `dio` sera ajouté lors de l'intégration Flutter.

### Utilitaires WhatsApp et Téléphone Natif
```typescript
// src/utils/nativeLinks.ts
import { Linking } from 'react-native';

export function callNumber(phone: string) {
  const cleaned = phone.replace(/\s+/g, '');
  Linking.openURL(`tel:${cleaned}`);
}

export function openWhatsApp(phone: string, message?: string) {
  const cleaned = phone.replace(/[\s+]/g, '');
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  Linking.openURL(`https://wa.me/${cleaned}${query}`);
}
```

---
*Documentation rédigée pour HopeGestionV2 — Prête pour l'intégration mobile autonome.*

