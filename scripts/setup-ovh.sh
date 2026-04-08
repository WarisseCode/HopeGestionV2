#!/bin/bash
# =============================================================================
# setup-ovh.sh — Installation initiale du VPS OVH pour HopeGestionV2
# Usage : sudo bash setup-ovh.sh
# OS cible : Ubuntu 22.04 LTS
# =============================================================================

set -e  # Arrêt immédiat en cas d'erreur

DOMAIN="hopegestion.com"
APP_DIR="/var/www/hopegestion"
GIT_REPO="https://github.com/VOTRE_ORG/HopeGestionV2.git"  # ← À modifier
DB_NAME="hopegestion"
DB_USER="hopegestion"
DB_PASSWORD=""  # ← Sera demandé interactivement

echo "======================================================"
echo "  Installation HopeGestion sur VPS OVH — Ubuntu 22.04"
echo "======================================================"

# ── 0. Mot de passe DB ──────────────────────────────────────────────────────
read -s -p "Choisissez un mot de passe pour PostgreSQL (utilisateur $DB_USER) : " DB_PASSWORD
echo ""

# ── 1. Mise à jour système ───────────────────────────────────────────────────
echo ""
echo "[1/10] Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Dépendances système ───────────────────────────────────────────────────
echo "[2/10] Installation des dépendances..."
apt-get install -y -qq \
    curl git nginx certbot python3-certbot-nginx \
    build-essential ufw fail2ban

# ── 3. Node.js 20 LTS ───────────────────────────────────────────────────────
echo "[3/10] Installation Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# ── 4. PostgreSQL ────────────────────────────────────────────────────────────
echo "[4/10] Installation PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

# Créer l'utilisateur et la base de données
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
echo "  ✅ Base de données '$DB_NAME' créée"

# ── 5. Répertoire applicatif ─────────────────────────────────────────────────
echo "[5/10] Clonage du dépôt..."
mkdir -p $APP_DIR
cd $APP_DIR
git clone $GIT_REPO .

mkdir -p /var/log/pm2
mkdir -p $APP_DIR/backend/uploads

# ── 6. Fichier .env backend ──────────────────────────────────────────────────
echo "[6/10] Configuration des variables d'environnement..."
cat > $APP_DIR/backend/.env <<EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
JWT_SECRET=$(openssl rand -base64 48)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 48)
FRONTEND_URL=https://$DOMAIN

# Email (Zoho ou autre SMTP)
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_USER=contact@$DOMAIN
EMAIL_PASSWORD=VOTRE_MOT_DE_PASSE_ZOHO
EMAIL_FROM="Hope Gestion" <contact@$DOMAIN>

# À configurer plus tard
FEDAPAY_SECRET_KEY=
GOOGLE_CLIENT_ID=
EOF
echo "  ✅ Fichier .env créé — pensez à compléter les valeurs manquantes"

# ── 7. Build backend + frontend ──────────────────────────────────────────────
echo "[7/10] Build de l'application..."

cd $APP_DIR/backend
npm ci --omit=dev
npm run build
npm run migrate-prod
echo "  ✅ Backend compilé et migrations exécutées"

cd $APP_DIR/frontend
npm ci
VITE_API_URL="https://$DOMAIN/api" npm run build
echo "  ✅ Frontend compilé"

# ── 8. PM2 ──────────────────────────────────────────────────────────────────
echo "[8/10] Configuration PM2..."
cd $APP_DIR
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash
echo "  ✅ PM2 configuré et démarré"

# ── 9. Nginx ─────────────────────────────────────────────────────────────────
echo "[9/10] Configuration Nginx..."
cp $APP_DIR/nginx/hopegestion.conf /etc/nginx/sites-available/hopegestion

# Config temporaire HTTP (avant SSL) pour que Certbot fonctionne
cat > /etc/nginx/sites-available/hopegestion-tmp <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/frontend/dist;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hopegestion-tmp /etc/nginx/sites-enabled/hopegestion
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  ✅ Nginx configuré (HTTP temporaire)"

# ── 10. SSL Let's Encrypt ────────────────────────────────────────────────────
echo "[10/10] Génération du certificat SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m contact@$DOMAIN

# Remplacer par la config finale avec SSL
ln -sf /etc/nginx/sites-available/hopegestion /etc/nginx/sites-enabled/hopegestion
nginx -t && systemctl reload nginx
echo "  ✅ SSL configuré"

# ── Pare-feu ─────────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  ✅ Installation terminée !"
echo "======================================================"
echo ""
echo "  URL :        https://$DOMAIN"
echo "  Backend :    pm2 status"
echo "  Logs :       pm2 logs hopegestion-backend"
echo "  DB :         psql -U $DB_USER -d $DB_NAME"
echo ""
echo "  ⚠️  À faire manuellement :"
echo "  1. Modifier $APP_DIR/backend/.env (EMAIL_PASSWORD, FEDAPAY_*, etc.)"
echo "  2. Configurer les Secrets GitHub (voir OVH_DEPLOYMENT.md)"
echo "  3. Tester le login : https://$DOMAIN"
echo ""
