# 🌐 Configuration du Domaine hopegestion.com sur Render

Voici les étapes pour lier votre domaine `hopegestion.com` à votre application Render.

## 1. Sur le Dashboard Render

1. Allez dans votre service **Web Service** (Frontend).
2. Cliquez sur l'onglet **Settings**.
3. Scrollez jusqu'à la section **Custom Domains**.
4. Cliquez sur **+ Add Custom Domain**.
5. Entrez `hopegestion.com` et cliquez sur **Save**.
6. (Optionnel) Ajoutez aussi `www.hopegestion.com` si vous voulez supporter le www.

## 2. Configuration DNS (Chez votre registrar - ex: OVH, GoDaddy, Namecheap)

Render va vous donner des enregistrements DNS à configurer. Voici ce qu'il faut faire généralement :

### A. Pour le domaine racine (@ ou hopegestion.com)
Il faut créer un enregistrement de type **A** (si votre registrar ne supporte pas ANAME/ALIAS à la racine, ce qui est souvent le cas).

* **Type** : `A`
* **Nom/Hôte** : `@` (ou vide)
* **Valeur/Cible** : `216.24.57.1` (IP Load Balancer de Render)

> **Note**: Render recommande d'utiliser un enregistrement `ANAME` ou `ALIAS` pointant vers votre URL Render (`hopegestion.onrender.com`) si votre fournisseur DNS le supporte (comme Cloudflare ou Namecheap). Sinon, utilisez l'IP `A` ci-dessus.

### B. Pour le sous-domaine (www)
Créez un enregistrement de type **CNAME**.

* **Type** : `CNAME`
* **Nom/Hôte** : `www`
* **Valeur/Cible** : `hopegestion.onrender.com` (ou le nom exact de votre service sur Render)

## 3. Configuration du Backend (CORS & Cookies)

Une fois le domaine actif, nous devons mettre à jour la configuration du backend pour accepter ce nouveau domaine.

1. **Variables d'environnement (Render)** :
   - Mettez à jour `FRONTEND_URL` pour : `https://hopegestion.com`
   - Ajoutez `https://www.hopegestion.com` si nécessaire (séparé par virgule si votre code le gère, sinon choisissez le principal).

2. **Mise à jour du code Backend** (`app.ts` / `index.ts`) :
   - Vérifiez que votre configuration CORS accepte ce nouveau domaine.
   - Actuellement, nous utilisons souvent `process.env.FRONTEND_URL`. Si vous l'avez mis à jour dans Render, ça devrait être bon.

## 4. Vérification

1. Attendez la propagation DNS (peut prendre de quelques minutes à 24h, souvent 1h).
2. Render va automatiquement générer un certificat SSL (HTTPS) pour votre domaine.
3. Accédez à `https://hopegestion.com`.

---

### ⚠️ Point important pour les Cookies (Auth)

Si votre authentification utilise des cookies `samesite: 'none'` et `secure: true` (ce qui est le cas pour le cross-site), cela continuera de fonctionner tant que le backend et le frontend sont tous les deux en HTTPS.

Cependant, il est **recommandé** de mettre le backend sur un sous-domaine du même domaine principal pour améliorer la fiabilité des cookies (ex: `api.hopegestion.com`).

**Si vous voulez faire ça (Recommandé) :**
1. Créez un service backend sur Render avec le domaine custom `api.hopegestion.com`.
2. Configurez le DNS : `CNAME` pour `api` vers votre service backend Render.
3. Mettez à jour `VITE_API_URL` dans le frontend pour pointer vers `https://api.hopegestion.com`.
4. Mettez à jour `FRONTEND_URL` dans le backend pour accepter `https://hopegestion.com`.
5. Dans la config des cookies backend, vous pourrez alors utiliser `domain: '.hopegestion.com'` si vous voulez partager les cookies, ou laisser par défaut pour le domaine de l'API.

*Pour l'instant, commencer simple avec juste le domaine Frontend fonctionne très bien !*
