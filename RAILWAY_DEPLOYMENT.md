# Déploiement Railway + Vercel — HopeGestionV2

Architecture : **Backend + DB → Railway** | **Frontend → Vercel**

---

## 1. Prérequis

- Compte Railway : https://railway.app
- Compte Vercel : https://vercel.com
- `pg_dump` installé en local (fourni avec PostgreSQL)
- Repo GitHub connecté aux deux plateformes

---

## 2. Déployer le Backend sur Railway

### 2.1 Créer le projet

1. Railway Dashboard → **New Project** → **Deploy from GitHub repo**
2. Sélectionner le repo `HopeGestionV2`
3. Service → **Settings** → **Source** → **Root Directory** : `backend`

> Le fichier `railway.toml` à la racine du repo configure automatiquement le build et le start.

### 2.2 Ajouter le plugin PostgreSQL

1. Dans le projet Railway → **+ New** → **Database** → **Add PostgreSQL**
2. Railway injecte automatiquement `DATABASE_URL` dans le service backend

### 2.3 Configurer les variables d'environnement

Dans **Service backend → Variables**, ajouter toutes les variables listées dans `backend/.env.example`.

Variables **obligatoires** pour le démarrage :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `REFRESH_TOKEN_SECRET` | `openssl rand -base64 48` (différent) |
| `FRONTEND_URL` | URL Vercel (étape 3) |
| `DATABASE_URL` | **auto-injecté** par Railway PostgreSQL |

Variables **optionnelles** (fonctionnalités dégradées si absentes) :

| Variable | Fonctionnalité |
|---|---|
| `EMAIL_*` | Reset mot de passe, notifications |
| `SPACES_*` | Upload fichiers/documents |
| `GOOGLE_CLIENT_ID` | Connexion Google OAuth |
| `FEDAPAY_*` | Paiements en ligne |
| `TWILIO_*` | Notifications WhatsApp |

### 2.4 Vérifier le déploiement

```
GET https://votre-backend.railway.app/api/ping
→ { "message": "Pong! API HopeGestionV2 opérationnelle." }
```

---

## 3. Déployer le Frontend sur Vercel

1. Vercel Dashboard → **Add New Project** → importer le repo GitHub
2. **Framework Preset** : Vite (auto-détecté)
3. **Root Directory** : `frontend`
4. **Build Command** : `npm run build` (auto)
5. **Output Directory** : `dist` (auto)

### 3.1 Variable d'environnement Vercel

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | URL Railway backend (ex: `https://xxx.railway.app`) |

> Dans Vercel : Settings → Environment Variables → ajouter `VITE_API_URL`

### 3.2 Mettre à jour le CORS côté Railway

Une fois l'URL Vercel connue, aller dans Railway **Service backend → Variables** :
```
FRONTEND_URL = https://hopegestion.vercel.app
```

### 3.3 Domaine personnalisé (optionnel)

- Vercel : Settings → Domains → ajouter `hopegestion.com`
- Railway : Settings → Networking → Custom Domain → ajouter `api.hopegestion.com`

---

## 4. Migration de la base de données (depuis Render)

### 4.1 Exporter depuis Render PostgreSQL

```bash
# Récupérer les credentials depuis Render Dashboard > Database > Connection
pg_dump \
  --no-acl \
  --no-owner \
  -Fc \
  "postgresql://USER:PASSWORD@HOST:PORT/DBNAME" \
  -f hopegestion_backup.dump
```

> `-Fc` = format custom (compressé, idéal pour pg_restore)
> `--no-acl --no-owner` = évite les erreurs de permissions sur la cible

### 4.2 Importer dans Railway PostgreSQL

```bash
# Récupérer DATABASE_URL depuis Railway Dashboard > PostgreSQL > Connect > Public URL
pg_restore \
  --no-acl \
  --no-owner \
  -d "postgresql://USER:PASSWORD@HOST:PORT/DBNAME" \
  hopegestion_backup.dump
```

### 4.3 Vérifier la migration

```bash
psql "postgresql://USER:PASSWORD@HOST:PORT/DBNAME" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

### 4.4 Alternative via Railway CLI

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Lier au projet
railway link

# Import direct (Railway CLI encapsule pg_restore)
railway run pg_restore --no-acl --no-owner -d $DATABASE_URL hopegestion_backup.dump
```

---

## 5. Ordre de déploiement recommandé

```
1. Créer le projet Railway + plugin PostgreSQL
2. Migrer la DB (4.1 → 4.2 → 4.3)
3. Configurer les variables Railway (section 2.3)
4. Déployer le backend Railway (auto via git push)
5. Tester /api/ping
6. Déployer le frontend Vercel (section 3)
7. Mettre à jour FRONTEND_URL sur Railway avec l'URL Vercel
8. Tester le login complet
```

---

## 6. Différences Railway vs Render

| Point | Render | Railway |
|---|---|---|
| Sleep (plan gratuit) | Oui (15 min inactivité) | Non (mais hobby plan payant) |
| PostgreSQL | Managed (plan free limité) | Plugin natif, même projet |
| Logs | Dashboard web | Dashboard + CLI |
| Scaling | Manuel | Manuel (configurable) |
| Prix estimé | ~$7/mois (starter) | ~$5/mois (hobby) |
