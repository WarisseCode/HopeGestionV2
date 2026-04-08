# Déploiement OVH VPS — HopeGestionV2

## Architecture

```
Internet
   │
   ▼
nginx (port 80/443) ── SSL Let's Encrypt
   │
   ├── /api/*  ──► Node.js via PM2 (port 8080)
   │                    │
   │                    └── PostgreSQL (localhost:5432)
   │
   └── /*      ──► React SPA (dist/ statique)
```

---

## Étape 1 — Préparer le VPS OVH

1. Commandez un **VPS Starter** (2 vCPU, 2 Go RAM) sur OVH
2. Choisissez **Ubuntu 22.04 LTS**
3. Notez l'IP publique (ex: `51.XX.XX.XX`)

---

## Étape 2 — DNS

Dans votre gestionnaire DNS (OVH ou autre), ajoutez :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `hopegestion.com` | `51.XX.XX.XX` |
| A | `www.hopegestion.com` | `51.XX.XX.XX` |

Attendez la propagation DNS (5-30 min).

---

## Étape 3 — Installation initiale

Connectez-vous en SSH :

```bash
ssh ubuntu@51.XX.XX.XX
```

Puis lancez le script d'installation :

```bash
curl -o setup.sh https://raw.githubusercontent.com/VOTRE_ORG/HopeGestionV2/main/scripts/setup-ovh.sh
# OU copiez le fichier via scp
sudo bash setup.sh
```

Le script installe automatiquement :
- Node.js 20, PM2
- PostgreSQL (crée la DB + l'utilisateur)
- Nginx + SSL Let's Encrypt
- Clone le dépôt, build, migrations, démarrage

---

## Étape 4 — Secrets GitHub Actions

Dans GitHub → votre dépôt → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | IP du VPS (ex: `51.XX.XX.XX`) |
| `VPS_USER` | `ubuntu` (ou `root`) |
| `VPS_SSH_KEY` | Clé SSH privée (voir ci-dessous) |
| `VPS_PORT` | `22` |
| `VITE_API_URL` | `https://hopegestion.com/api` |

### Générer la clé SSH pour GitHub Actions

Sur votre machine locale :

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/hopegestion_deploy -N ""
```

Copiez la clé publique sur le VPS :

```bash
ssh-copy-id -i ~/.ssh/hopegestion_deploy.pub ubuntu@51.XX.XX.XX
```

Copiez le contenu de `~/.ssh/hopegestion_deploy` (clé **privée**) dans le secret `VPS_SSH_KEY`.

---

## Étape 5 — Variables d'environnement sur le VPS

Éditez `/var/www/hopegestion/backend/.env` :

```bash
sudo nano /var/www/hopegestion/backend/.env
```

Complétez les valeurs manquantes :

```env
EMAIL_PASSWORD=votre-mot-de-passe-zoho
FEDAPAY_SECRET_KEY=sk_live_...
GOOGLE_CLIENT_ID=...
ADMIN_EMAIL=superadmin@hope.com
```

Puis redémarrez :

```bash
pm2 restart hopegestion-backend --update-env
```

---

## Commandes utiles sur le VPS

```bash
# Statut du backend
pm2 status

# Logs en temps réel
pm2 logs hopegestion-backend

# Redémarrer le backend
pm2 restart hopegestion-backend

# Recharger nginx
sudo systemctl reload nginx

# Vérifier nginx
sudo nginx -t

# Accéder à PostgreSQL
psql -U hopegestion -d hopegestion

# Renouveler SSL (automatique, mais force possible)
sudo certbot renew
```

---

## Migration depuis Railway

Pour migrer la base de données Railway → OVH :

```bash
# Sur votre machine locale
# 1. Dump depuis Railway
pg_dump "postgresql://USER:PASS@HOST:PORT/DB" > backup_railway.sql

# 2. Restaurer sur OVH (via SSH tunnel)
ssh ubuntu@51.XX.XX.XX "psql -U hopegestion -d hopegestion" < backup_railway.sql
```

---

## Déploiement automatique

Chaque `git push` sur `main` déclenche automatiquement le workflow GitHub Actions qui :
1. Build le backend TypeScript
2. Build le frontend React
3. Se connecte au VPS via SSH
4. Pull le code, rebuild, migre la DB, redémarre PM2, recharge nginx
