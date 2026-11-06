# Plan de corrections — Backend HopeGestion
## Audit du 2026-05-05

---

## Vue d'ensemble

| Bloc | Priorité | Durée estimée | Risque de régression |
|------|----------|---------------|----------------------|
| Bloc 1 — Sécurité immédiate | 🔴 Critique | ~45 min | Faible |
| Bloc 2 — Corrections de code | 🟠 Majeur | ~2h | Moyen |
| Bloc 3 — Améliorations | 🟡 Mineur | ~3h | Faible |

---

## BLOC 1 — Sécurité immédiate
> **Objectif** : Éliminer les vecteurs d'attaque actifs sans toucher à la logique métier.
> Peut être déployé en un seul commit sécurisé.

### 1.1 Sortir `.env` du dépôt git

**Fichier concerné** : `backend/.env`

**Pourquoi c'est urgent** : Les credentials (DB, JWT, FedaPay, email, Google OAuth) sont accessibles
à quiconque a accès au repo. Même en repo privé, un leak de token d'accès GitHub suffit.

**Étapes** :
```bash
# 1. Ajouter .env au .gitignore
echo "backend/.env" >> .gitignore
echo "backend/.env.*" >> .gitignore

# 2. Retirer .env de l'historique git (sans supprimer le fichier local)
git rm --cached backend/.env

# 3. Créer un .env.example avec des valeurs vides comme documentation
cp backend/.env backend/.env.example
# Puis vider les valeurs sensibles dans .env.example

# 4. Commit
git add .gitignore backend/.env.example
git commit -m "security: remove .env from git, add .env.example"
```

**Nouveaux secrets à générer** (après la correction) :
```bash
# JWT_SECRET (64 octets)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# DB_PASSWORD : choisir un mot de passe fort (20+ chars, mixte)
# FEDAPAY : régénérer depuis le dashboard FedaPay
# EMAIL_PASSWORD : vérifier si le mot de passe mail a été compromis
```

**Variables GitHub Actions à configurer** :
- `DB_PASSWORD`
- `JWT_SECRET`
- `FEDAPAY_SECRET_KEY`
- `FEDAPAY_PUBLIC_KEY`
- `EMAIL_PASSWORD`
- `GOOGLE_CLIENT_SECRET`

---

### 1.2 Corriger le CORS Wildcard sur `/uploads`

**Fichier** : `backend/index.ts` lignes 159–163

**Code actuel** :
```typescript
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');         // ❌
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '../uploads')));
```

**Code corrigé** :
```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Cross-Origin-Resource-Policy', 'same-site');
    next();
}, express.static(path.join(__dirname, '../uploads')));
```

**À ajouter dans `.env`** :
```
ALLOWED_ORIGINS=https://hopegestion.com,https://www.hopegestion.com
```

---

### 1.3 Supprimer les `console.log` de données sensibles

**Fichiers concernés** :
- `backend/routes/authRoutes.ts` lignes 898, 1099, 1574
- `backend/routes/compteRoutes.ts` ligne 304
- `backend/routes/messageRoutes.ts` ligne 74
- `backend/routes/googleAuthRoutes.ts` ligne 130

**Approche** : grep global + suppression/remplacement

```bash
# Repérer toutes les instances problématiques
grep -n "console.log.*req\.body\|console.log.*email\|console.log.*password\|error\.stack" backend/routes/*.ts
```

**Règle à appliquer** :
- `console.log('[PUT /profile] Received body:', JSON.stringify(req.body))` → **supprimer**
- `console.log('... email ...')` → remplacer par `console.log('... userId:', user.id)`
- `res.json({ error: error.stack })` → remplacer par `res.status(500).json({ error: 'Erreur interne du serveur' })`

---

## BLOC 2 — Corrections de code
> **Objectif** : Éliminer les vulnérabilités dans la logique applicative.
> Chaque correction doit être testée manuellement sur le dashboard avant déploiement.

### 2.1 Injection SQL — Remplacer `join(',')` par `ANY($n::int[])`

**Fichiers concernés** :

| Fichier | Ligne | Code actuel |
|---------|-------|-------------|
| `dashboardRoutes.ts` | 29 | `` `owner_id IN (${validOwnerIds.join(',')})` `` |
| `dashboardRoutes.ts` | 30 | `` `l.owner_id IN (${validOwnerIds.join(',')})` `` |
| `bienRoutes.ts` | 29 | `` `WHERE b.owner_id IN (${validOwnerIds.join(',')})` `` |
| `bienRoutes.ts` | 96 | même pattern |
| `locataireRoutes.ts` | 58 | `` `AND t.owner_id IN (${validOwnerIds.join(',')})` `` |

**Pattern de correction** :

```typescript
// AVANT ❌
const ownerFilter = isAdmin ? '1=1' : `owner_id IN (${validOwnerIds.join(',')})`;
dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${ownerFilter}`);

// APRÈS ✅
if (isAdmin) {
    const result = await dbClient.query('SELECT COUNT(*) FROM buildings');
} else {
    const result = await dbClient.query(
        'SELECT COUNT(*) FROM buildings WHERE owner_id = ANY($1::int[])',
        [validOwnerIds]
    );
}
```

**Attention** : Cette refacto change la structure des requêtes. Tester chaque endpoint
du dashboard (KPI, graphiques, liste biens) après modification.

---

### 2.2 Protéger la route `/test-email`

**Fichier** : `backend/routes/authRoutes.ts` ligne 936

**Code actuel** :
```typescript
router.get('/test-email', async (req: Request, res: Response) => {
```

**Code corrigé** :
```typescript
router.get('/test-email', protect, requireRole('admin'), async (req: Request, res: Response) => {
```

**Pas de test requis** — modification d'une seule ligne.

---

### 2.3 Remplacer les dummy hashes par des hashes aléatoires valides

**Fichier** : `backend/routes/authRoutes.ts` lignes 1047 et 1188

**Code actuel** :
```typescript
// Ligne 1047
const tempHash = '$2b$10$INVALIDHASHForInvitedUserOnlyXXXXXXXXXXXXXXXXXXXXX';

// Ligne 1188
const dummyHash = '$2b$10$GUESTACCESSHASHONLYXXXXXXXXXXXXXXXXXXXXX';
```

**Code corrigé** :
```typescript
// Générer un hash aléatoire non-devinable (pas de mot de passe réel)
const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
```

**Impact** : Légère latence à la création de compte invité (bcrypt ~100ms). Acceptable.

---

### 2.4 Hasher les access keys invités en base

**Fichier** : `backend/routes/authRoutes.ts` — création et vérification des access keys

**Principe** :
```typescript
// À la création de la clé (stockage)
const rawKey = `GUEST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
await pool.query('UPDATE users SET access_key = $1 WHERE id = $2', [hashedKey, userId]);
// Retourner rawKey à l'utilisateur (une seule fois)

// À la vérification (login)
const { accessKey } = req.body;
const hashedKey = crypto.createHash('sha256').update(accessKey).digest('hex');
const result = await pool.query('SELECT * FROM users WHERE access_key = $1', [hashedKey]);
```

**Migration DB nécessaire** :
```sql
-- Vider les access_key existantes (les utilisateurs devront en régénérer)
UPDATE users SET access_key = NULL WHERE is_guest = true;
```

---

## BLOC 3 — Améliorations
> **Objectif** : Renforcer la robustesse sans urgence immédiate.
> Planifier sur le sprint suivant.

### 3.1 Transaction `SELECT FOR UPDATE` sur le refresh token

**Fichier** : `backend/routes/authRoutes.ts` — endpoint `/refresh`

**Objectif** : Éviter la race condition si deux requêtes arrivent simultanément avec le même token.

```typescript
const client = await pool.connect();
try {
    await client.query('BEGIN');

    // Verrouiller la ligne du token pour éviter la race condition
    const tokenRow = await client.query(
        'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
        [tokenHash]
    );

    if (!tokenRow.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'Token invalide' });
    }

    // Invalider l'ancien + émettre le nouveau dans la même transaction
    await client.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    const { accessToken, refreshToken } = await issueTokenPair(userId, role, userType);

    await client.query('COMMIT');
    res.json({ accessToken, refreshToken });
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
```

---

### 3.2 Centraliser la validation de mot de passe

**Fichier** : Créer `backend/utils/passwordValidator.ts`

```typescript
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Minimum 8 caractères');
    if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule');
    if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Au moins un caractère spécial');
    return { valid: errors.length === 0, errors };
}
```

**Fichiers à mettre à jour** : `authRoutes.ts`, `invitationRoutes.ts`, `compteRoutes.ts`

---

### 3.3 Validation du contenu réel des uploads (magic bytes)

**Fichier** : `backend/middleware/uploadMiddleware.ts`

**Installer** :
```bash
npm install file-type
```

**Modifier le middleware** :
```typescript
import { fileTypeFromBuffer } from 'file-type';

// Dans le handler après l'upload Multer
const buffer = fs.readFileSync(file.path);
const detected = await fileTypeFromBuffer(buffer);

if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
    fs.unlinkSync(file.path); // Supprimer le fichier malveillant
    return res.status(400).json({ error: 'Format de fichier invalide' });
}

// Renommer avec extension correcte (ne pas utiliser le nom original)
const safeFilename = `${crypto.randomUUID()}.${detected.ext}`;
fs.renameSync(file.path, path.join(path.dirname(file.path), safeFilename));
```

---

### 3.4 Crash-fail au démarrage si DB indisponible

**Fichier** : `backend/index.ts` lignes 48–60

**Code corrigé** :
```typescript
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL connecté');
        client.release();
        startServer(); // Déplacer app.listen() ici
    })
    .catch(err => {
        console.error('❌ Impossible de se connecter à PostgreSQL:', err.message);
        process.exit(1); // Fail fast — le process manager (PM2) relancera
    });
```

---

## Checklist de déploiement par bloc

### Avant chaque bloc
- [ ] Créer une branche dédiée (`fix/security-bloc-1`, etc.)
- [ ] Faire un backup de la base de production
- [ ] Vérifier que les tests PM2 passent en local

### Bloc 1
- [ ] `.env` sorti du git + `.gitignore` mis à jour
- [ ] `.env.example` créé avec valeurs vides
- [ ] Nouveaux secrets générés et configurés dans GitHub Actions
- [ ] CORS `/uploads` corrigé
- [ ] `console.log` sensibles supprimés
- [ ] Build OK → déploiement → vérifier les logs PM2

### Bloc 2
- [ ] Injection SQL corrigée dans `dashboardRoutes.ts`
- [ ] Tester le dashboard gestionnaire (KPI + graphiques)
- [ ] Injection SQL corrigée dans `bienRoutes.ts`
- [ ] Tester la liste des biens
- [ ] Injection SQL corrigée dans `locataireRoutes.ts`
- [ ] Tester la liste des locataires
- [ ] Route `/test-email` protégée
- [ ] Dummy hashes remplacés
- [ ] Access keys hashées + migration SQL exécutée
- [ ] Build OK → déploiement → test complet de l'auth

### Bloc 3
- [ ] Transaction sur refresh token
- [ ] `validatePassword` centralisé
- [ ] `file-type` installé + middleware mis à jour
- [ ] Crash-fail DB au démarrage
- [ ] Build OK → déploiement final

---

## Risques identifiés

| Correction | Risque | Mitigation |
|------------|--------|------------|
| Sortir `.env` | Variables manquantes en prod si GitHub Actions pas configuré | Vérifier toutes les vars avant le push |
| `ANY($1::int[])` | Requêtes cassées si `validOwnerIds` est vide (résultat = 0 au lieu d'erreur) | Gérer le cas `validOwnerIds.length === 0` explicitement |
| Hash des access keys | Clés existantes invalides → utilisateurs invités déconnectés | Notifier + laisser 24h de transition avec les deux formats |
| Crash-fail DB | PM2 en boucle si DB down → logs flooding | Ajouter exponential backoff avant `process.exit` |
