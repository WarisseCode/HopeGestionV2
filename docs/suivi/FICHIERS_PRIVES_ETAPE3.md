# Fichiers privés — étape 3 : fermer l'accès sans signature
**Date** : 2026-11-22 · **Suite de** : `INVENTAIRE_FICHIERS_2026-11-19.md` (§ 4), T-110 (étape 1, en ligne) · **Étape 2** : vérification d'affichage faite par l'utilisateur le 2026-11-22, tout s'affiche.

> **✅ Appliquée le 2026-11-24.** Étape A par le script (`Cross-Origin-Resource-Policy: same-site` constaté sur un fichier privé), puis étape B (`FILE_URLS_ENFORCE=true`). Contrôles faits sur le VPS : fichier privé sans signature → **403**, photo de bien → **200** ; les fichiers existants s'ouvrent depuis le site.
> Effet de bord constaté puis corrigé (T-113) : un fichier **absent du disque** (photos perdues) affichait du JSON brut (« Route not found ») au lieu de la page 404 de nginx. Node renvoie désormais une page lisible.

**Où cela se fait** : sur le VPS. Le code nécessaire est **déjà en ligne** depuis l'étape 1 ; il ne reste que deux réglages.

**Ordre et principe** : chaque étape se vérifie avant de passer à la suivante, et se défait en une commande.

| Étape | Ce qui change | Effet pour les utilisateurs |
|---|---|---|
| A. nginx | les fichiers privés passent par Node, les photos des biens restent servies par nginx | **aucun** (contrôle encore éteint) |
| B. contrôle | `FILE_URLS_ENFORCE=true`, puis redémarrage | un lien sans signature valide → « Lien expiré » |

Comportement testé avant de rédiger cette procédure, sur un serveur réel :

| Demande | Contrôle éteint | Contrôle activé |
|---|---|---|
| Lien signé renvoyé par l'API | 200 | 200, `Cache-Control: private` |
| Même fichier sans signature | 200 | **403** « Lien expiré ou invalide… » |
| Signature d'un autre fichier | 200 | **403** |
| Photo de bien sans signature | 200 | 200 |
| Nom de fichier accentué, signé | — | 200 |
| Remontée de dossier (`..%2F`) | — | 404 |

---

## A. nginx : faire passer les fichiers privés par Node

> **Mise à jour du 2026-11-24.** Une première tentative par modification manuelle n'avait pas été prise en compte : `nginx -T` montrait encore l'ancien bloc. La sauvegarde ne doit pas non plus être placée dans `sites-enabled/`, car nginx y charge **tous** les fichiers et la prendrait pour un second site. La méthode ci-dessous remplace la modification manuelle : elle est scriptée, sauvegarde dans le dossier personnel et restaure toute seule en cas d'échec.

Le fichier du site chargé par nginx est `/etc/nginx/sites-enabled/hopegestion` (relevé le 2026-11-24 avec `nginx -T`). Le script `scripts/nginx-uploads-prives.py` du dépôt :
- remplace l'unique bloc `location ^~ /uploads/ { alias … }` par les deux blocs ci-dessous ;
- s'arrête **sans rien modifier** s'il ne trouve pas exactement ce bloc, ou s'il a déjà été appliqué.

```bash
F=$(readlink -f /etc/nginx/sites-enabled/hopegestion); echo "Fichier : $F"
sudo cp "$F" ~/hopegestion.nginx.bak-2026-11-24
sudo python3 /var/www/hopegestion/scripts/nginx-uploads-prives.py "$F"
sudo nginx -t && sudo systemctl reload nginx \
  || { echo "ÉCHEC : restauration"; sudo cp ~/hopegestion.nginx.bak-2026-11-24 "$F"; sudo nginx -t && sudo systemctl reload nginx; }
```

Blocs obtenus :
```nginx
    # Photos des biens : publiques (annonces des lots vacants), servies directement.
    location ^~ /uploads/properties/ {
        alias /var/www/hopegestion/backend/uploads/properties/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Autres fichiers (pièces d'identité, quittances, baux…) : transmis à Node, qui vérifie
    # la signature du lien quand FILE_URLS_ENFORCE=true.
    location ^~ /uploads/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
```

**Contrôle indispensable avant l'étape B.** Seul Node ajoute l'en-tête `Cross-Origin-Resource-Policy` :
```bash
curl -sI https://hopegestion.com/uploads/documents/<fichier> | grep -i cross-origin-resource-policy   # doit afficher « same-site »
curl -sI https://hopegestion.com/uploads/properties/<fichier> | grep -iE "cross-origin|expires"        # seulement « Expires »
```

4. **Vérifier**. Le résultat doit être identique à aujourd'hui :
   - une photo de lot s'affiche sur le site ;
   - une pièce d'identité, une quittance et un état des lieux s'ouvrent depuis le site ;
   - le lien direct d'un fichier privé **sans** `?exp=` s'ouvre **encore** : le contrôle est éteint, c'est normal.

**Retour arrière A** :
```bash
F=$(readlink -f /etc/nginx/sites-enabled/hopegestion)
sudo cp ~/hopegestion.nginx.bak-2026-11-24 "$F" && sudo nginx -t && sudo systemctl reload nginx
```

---

## B. Activer le contrôle des signatures

1. **Ajouter la variable et redémarrer le serveur API** (quelques secondes de coupure, comme un déploiement) :
   ```bash
   cd /var/www/hopegestion/backend
   grep -q '^FILE_URLS_ENFORCE=' .env || echo 'FILE_URLS_ENFORCE=true' >> .env
   grep '^FILE_URLS_ENFORCE=' .env     # doit afficher FILE_URLS_ENFORCE=true
   pm2 restart hopegestion-backend --update-env && pm2 save
   ```
   - `.env` n'est pas suivi par git : le déploiement automatique (`git reset --hard`) ne l'efface pas.

2. **Vérifier** :
   - depuis le site et l'application mobile : pièce d'identité, quittance, bail, état des lieux, justificatif de dépense et photos de lot s'ouvrent ;
   - le lien direct d'un fichier privé **sans** `?exp=…&sig=…` affiche maintenant `{"message":"Lien expiré ou invalide. Rouvrez le document depuis HopeGestion."}` ;
   - la même adresse avec un `sig=` modifié d'un caractère est refusée de la même façon.

**Retour arrière B** :
```bash
cd /var/www/hopegestion/backend
sed -i '/^FILE_URLS_ENFORCE=/d' .env
pm2 restart hopegestion-backend --update-env && pm2 save
```

---

## Ce qui reste vrai après l'étape 3
- **Lien expiré.** Un document laissé ouvert dans un onglet plus d'1 h 30, sans changer de page, peut afficher « Lien expiré ». Rouvrir la page donne un lien neuf. C'est la durée de 1 h choisie.
- **Images expirées.** Une image d'une page restée ouverte trop longtemps est remplacée par le visuel neutre (T-097) jusqu'au prochain rafraîchissement.
- **Spaces.** Si DigitalOcean Spaces est activé un jour, les fichiers y seront déposés en `public-read`. Il faudra alors passer les dossiers privés en `private` et utiliser `getSignedUrl()`. Aujourd'hui, tout est sur le disque du VPS.
- **Répertoire du dépôt.** `nginx/hopegestion.conf` contient déjà la nouvelle configuration : le dépôt et le VPS restent alignés.
