# En-têtes de sécurité et documentation de l'API (audit S8)
**Date** : 2026-11-24 · **Suite de** : `AUDIT_2026-11-14.md` (S8) · **Journal** : T-117

> **✅ Étapes A et B appliquées sur le VPS le 2026-11-24** : `/api/docs` → 404 ; script nginx appliqué (3 blocs), `nginx -t` OK, les 5 en-têtes constatés sur `https://hopegestion.com/`. **Reste l'étape C** (lecture des infractions CSP après quelques jours, puis application de la CSP).

## En bref
| Point de l'audit | État avant | Après cette étape |
|---|---|---|
| `/api/docs` (Swagger) décrit toute l'API à tout visiteur | public | **coupé en production** (404). Réactivable avec `API_DOCS_ENABLED=true` |
| En-têtes de sécurité sur les réponses de Node (API, fichiers privés) | déjà présents (Helmet, sur toute l'application et pas seulement `/api` comme le disait l'audit) | inchangés |
| En-têtes de sécurité sur ce que sert nginx (page du site, JS/CSS, photos des biens) | **aucun** | HSTS, anti-iframe, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Politique de contenu (CSP) de la page du site | aucune | **en observation** : rien n'est bloqué, les infractions sont journalisées |
| Ordre des règles nginx pour `/uploads/` | réglé (T-109, T-112) | — |

## Pourquoi la CSP est d'abord « en observation »
La CSP liste les seuls sites autorisés à fournir scripts, styles, images et cadres. Appliquée d'un coup, elle casserait toute fonction qui charge une ressource oubliée, par exemple la connexion Google.

En mode **observation** (`Content-Security-Policy-Report-Only`), le navigateur ne bloque rien. Il envoie chaque infraction à `/api/csp-report`, que Node écrit dans ses journaux sous la forme d'une ligne `[CSP] directive=… bloqué=… page=…`, une seule fois par heure pour chaque infraction.

Après quelques jours d'utilisation réelle, on relit ces lignes, on ajuste la politique, puis on l'applique (étape C).

**Vérifié avant mise en ligne** : la page construite a été servie par ce nginx dans un navigateur, sur l'accueil, la connexion, l'inscription et les pages publiques. Les seules infractions venaient de l'adresse d'API factice du test, qui ne correspond pas au domaine du site. En production, l'API est sur le même domaine (`'self'`).

---

## A. Après la fusion et le déploiement : vérifier `/api/docs`
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hopegestion.com/api/docs/
```
- **`404`** : la documentation est bien coupée.
- **`200`** : le serveur ne tourne pas avec `NODE_ENV=production`. Vérifiez `grep '^NODE_ENV=' /var/www/hopegestion/backend/.env`. Si la ligne manque, ajoutez `NODE_ENV=production`, puis lancez `pm2 restart hopegestion-backend --update-env && pm2 save`. Attention : ce réglage a d'autres effets (connexion à la base en SSL, messages d'erreur réduits). Prévenez-moi avant de l'ajouter s'il était absent.

## B. Ajouter les en-têtes dans nginx
Le script `scripts/nginx-entetes-securite.py` ajoute les en-têtes dans les trois blocs servis par nginx : la page du site, les fichiers statiques et les photos des biens. Il s'arrête **sans rien modifier** s'il ne trouve pas exactement ces blocs, ou s'il a déjà été appliqué.
```bash
F=$(readlink -f /etc/nginx/sites-enabled/hopegestion); echo "Fichier : $F"
sudo cp "$F" ~/hopegestion.nginx.bak-s8
sudo python3 /var/www/hopegestion/scripts/nginx-entetes-securite.py "$F"
sudo nginx -t && sudo systemctl reload nginx \
  || { echo "ÉCHEC : restauration"; sudo cp ~/hopegestion.nginx.bak-s8 "$F"; sudo nginx -t && sudo systemctl reload nginx; }
```

**Contrôle :**
```bash
curl -sI https://hopegestion.com/ | grep -iE "x-frame|x-content-type|referrer-policy|permissions-policy|content-security"
```
Cinq lignes sont attendues, dont `X-Frame-Options: DENY` et `Content-Security-Policy-Report-Only: …`.

Ensuite, utilisez le site normalement pendant quelques minutes : connexion, y compris avec Google, ouverture de documents, paiement. Rien ne doit changer, puisque la CSP ne bloque rien à ce stade.

**Retour arrière :**
```bash
F=$(readlink -f /etc/nginx/sites-enabled/hopegestion)
sudo cp ~/hopegestion.nginx.bak-s8 "$F" && sudo nginx -t && sudo systemctl reload nginx
```

## C. Dans 3 à 7 jours : lire les infractions, puis appliquer la CSP
```bash
grep -h "\[CSP\]" /var/log/pm2/hopegestion-error.log /var/log/pm2/hopegestion-out.log 2>/dev/null | sort | uniq -c | sort -rn | head -30
```
Envoyez-moi le résultat. Si des ressources légitimes y figurent, j'ajuste la politique.

Une fois la liste vide ou ajustée, l'application de la CSP consiste à retirer `-Report-Only` du nom de l'en-tête. Je fournirai alors la commande exacte.
