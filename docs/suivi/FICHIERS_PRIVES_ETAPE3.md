# Fichiers privés — étape 3 : fermer l'accès sans signature
**Date** : 2026-11-22 · **Suite de** : `INVENTAIRE_FICHIERS_2026-11-19.md` (§ 4), T-110 (étape 1, en ligne) · **Étape 2** : vérification d'affichage faite par l'utilisateur le 2026-11-22, tout s'affiche.

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

1. **Trouver le fichier de configuration du site**, puis en faire une copie de sauvegarde :
   ```bash
   sudo nginx -T 2>/dev/null | grep "# configuration file"
   # Repérez le fichier du site (souvent /etc/nginx/sites-available/hopegestion ou …/default).
   # Dans la suite, remplacez <FICHIER> par ce chemin.
   sudo cp <FICHIER> <FICHIER>.bak-2026-11-22
   ```

2. **Ouvrir le fichier** (`sudo nano <FICHIER>`) et remplacer **tout le bloc** qui commence par `location ^~ /uploads/ {` et se termine par l'accolade fermante `}` correspondante, par :
   ```nginx
       # Photos des biens : publiques (annonces des lots vacants), servies directement.
       location ^~ /uploads/properties/ {
           alias /var/www/hopegestion/backend/uploads/properties/;
           expires 30d;
           add_header Cache-Control "public";
       }

       # Autres fichiers (pièces d'identité, quittances, baux, signatures…) : transmis à
       # Node, qui vérifie la signature du lien quand FILE_URLS_ENFORCE=true.
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
   - **Où modifier** : seulement dans le bloc `server` qui contient `listen 443` (celui qui a `root /var/www/hopegestion/frontend/dist`). Le bloc du port 80 ne fait que rediriger.
   - **Le port 8080** est celui déjà utilisé par `location /api/`. Vérifiez qu'il est identique dans votre fichier.

3. **Tester puis recharger** (le rechargement ne coupe pas le site) :
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
   Si `nginx -t` signale une erreur, rien n'est rechargé : corrigez, ou restaurez la sauvegarde.

4. **Vérifier**. Le résultat doit être identique à aujourd'hui :
   - une photo de lot s'affiche sur le site ;
   - une pièce d'identité, une quittance et un état des lieux s'ouvrent depuis le site ;
   - le lien direct d'un fichier privé **sans** `?exp=` s'ouvre **encore** : le contrôle est éteint, c'est normal.

**Retour arrière A** :
```bash
sudo cp <FICHIER>.bak-2026-11-22 <FICHIER> && sudo nginx -t && sudo systemctl reload nginx
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
