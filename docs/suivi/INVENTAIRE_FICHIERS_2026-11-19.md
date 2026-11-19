# Inventaire des fichiers — accès public ou privé
**Date** : 2026-11-19 · **Suite de** : audit S7 (`AUDIT_2026-11-14.md`) et inventaire T-013 (journal, 2026-09-30) · **Méthode** :
- lecture du code backend, frontend et de l'application mobile (`HopeGestionMobile`) ;
- schéma de la base reconstruit à partir des migrations.

**Aucun fichier de code modifié.**

## En bref
- **Aujourd'hui, tout fichier est lisible sans connexion par quiconque possède son lien** : pièces d'identité, quittances, baux signés, signatures, justificatifs. Seule protection : un lien difficile à deviner (32 caractères aléatoires).
- **Le risque réel, c'est un lien qui circule** : copié dans un e-mail, une capture d'écran, un historique de navigateur ou un journal de serveur. Il reste valable pour toujours.
- **Une correction est possible sans changer l'application mobile ni la plupart des écrans du site**. L'API remplacerait, dans ses réponses, chaque lien sensible par un lien temporaire signé (valable par exemple 1 heure). Les liens enregistrés en base ne changent pas.
- **5 décisions vous reviennent** (§ 5) avant de corriger.
- **Constat urgent, indépendant du reste (§ 7)** : avec la configuration nginx du dépôt, les photos JPG/PNG stockées sur le disque du VPS renvoient probablement une erreur 404 alors qu'elles existent. C'est peut-être une partie des photos « perdues ». La correction tient en une ligne, après une vérification sur le VPS.

---

## 1. Comment les fichiers sont servis aujourd'hui

| Voie | Où | Contrôle d'accès |
|---|---|---|
| nginx `location /uploads/` | `/var/www/hopegestion/backend/uploads/` | **Aucun** (cache public 30 jours) |
| Node `app.use('/uploads', express.static…)` | même dossier (si nginx ne le sert pas) | **Aucun** (seulement une règle CORS) |
| DigitalOcean Spaces | `uploadToSpaces()` avec `ACL: 'public-read'` | **Aucun** (lien CDN public) |

- **Quels fichiers vont où** :
  - les quittances et les reçus de dons sont **toujours** écrits sur le disque du VPS ;
  - les autres fichiers partent vers Spaces si ses clés sont configurées, sinon sur le disque.
- **À confirmer sur la production** : où sont réellement vos fichiers ? La requête du § 6 le dit en une ligne. La perte de photos lors de la suspension du serveur laisse penser qu'ils sont sur le disque du VPS (à confirmer).
- **Lien temporaire déjà prévu** : `getSignedUrl()` existe dans `spacesUploadService.ts`, mais n'est appelée nulle part.

## 2. Inventaire par type de fichier

| Fichier | Dossier | Lien enregistré dans | Affiché par | Sensibilité | Proposition |
|---|---|---|---|---|---|
| **Pièce d'identité du locataire** (scan/photo) | `documents/` | `tenants.photo_piece_url` | site (fiche locataire), mobile | 🔴 donnée d'identité | **Privé** |
| **Quittances de loyer** (PDF) | `receipts/` | `payments.quittance_url` | site, mobile | 🔴 nom, adresse, montants | **Privé** |
| **Baux générés** (PDF) | `documents/` (`Bail_…`) | `documents.url`, `leases.contrat_url` | site | 🔴 contrat complet | **Privé** |
| **Documents envoyés** (catégories identité, baux, etc.) | `documents/` ou `<année>/<mois>/` | `documents.url` | site | 🔴 variable | **Privé** |
| **Signatures manuscrites** (bail, EDL, inventaire) | `signatures/`, `documents/` | `leases.signature_url`, `signatures_json`, `inventories.signature_*` | site | 🔴 réutilisable frauduleusement | **Privé** |
| **Justificatifs de dépense** | `expenses/` | `expenses.proof_url` | site, mobile | 🟠 factures, montants | **Privé** |
| **Reçus de dons** | `donation-receipts/` | `donations.receipt_url` | super-admin | 🟠 nom du donateur | **Privé** |
| **Photos d'état des lieux / d'inventaire** | `inventories/` | `edl_items.photos`, `inventory_items.photos` | site | 🟠 intérieur d'un logement occupé | **À décider** (§ 5) |
| **Photo de profil d'un locataire** | `avatars/` ou `documents/` | `tenants.photo_profil_url` | site, mobile | 🟠 visage | **À décider** |
| **Avatar d'un utilisateur / propriétaire** | `avatars/` | `users.avatar_url`, `users.photo_url`, `owners.photo_url` | site, mobile | 🟡 visage | **À décider** |
| **Photos des immeubles et des lots** | `properties/` | `buildings.photos`, `buildings.photo_url`, `lots.photos` | site, mobile, **pages publiques** des lots vacants | 🟢 voulues publiques | **Public** (sinon les annonces cassent) |
| Photos des tickets d'intervention | — (en base, image encodée) | `tickets.photos_before/after` | site | protégées par l'API | Rien à faire |

## 3. Ce qui casserait si l'on coupait simplement l'accès
- **Les annonces publiques** (`GET /api/public/lots`) affichent les photos des lots : elles doivent rester publiques.
- **Les écrans qui ouvrent le fichier à partir du lien enregistré** : 46 endroits sur le site (`<img src>`, `window.open`, liens), ainsi que l'application mobile pour les quittances, les pièces d'identité, les justificatifs et les photos de profil.
  - Une page ou une image n'envoie pas le jeton de connexion : un simple « réservé aux personnes connectées » casserait tous ces affichages.
- **Le cache des pages du site (T-098)** garde les listes affichées, avec leurs liens.
  - Les données mises en cache peuvent dater de plusieurs minutes. Avec des liens temporaires, la validité doit donc être bien plus longue que ce délai.
  - À la prochaine mise à jour de la page, l'API renvoie de toute façon des liens neufs.

## 4. Solution recommandée : des liens temporaires signés, distribués par l'API
1. **En base, rien ne change.** Les liens restent enregistrés tels quels.
2. **Liens signés.** Quand l'API renvoie un bail, un locataire, un paiement, une dépense ou un document, elle remplace chaque lien d'un dossier privé par un lien signé, valable par exemple 1 heure.
   - Format : `…/receipts/x.pdf?exp=1763600000&sig=…`, signé par le serveur avec un secret.
   - Fichiers sur Spaces : lien présigné S3, la fonction existe déjà.
3. **Les dossiers privés refusent tout lien non signé ou expiré.**
   - Fichiers sur le disque : nginx vérifie la signature lui-même (module `secure_link`), ou transmet la demande au serveur Node qui la vérifie.
   - Fichiers sur Spaces : ils passent en `private`, et seul le lien présigné fonctionne.
4. **Le site et l'application mobile n'ont rien à changer.** Ils utilisent déjà le lien fourni par l'API ; ce lien sera simplement temporaire.
5. **Fichiers déjà en ligne.** Les fichiers existants sur Spaces doivent être passés en privé un par un, avec un script lancé une fois. Ceux du disque sont protégés dès que nginx est modifié.

**Ce que cela demande sur le VPS** : une modification de `nginx/hopegestion.conf`, puis `sudo nginx -t && sudo systemctl reload nginx`.
- Le déploiement automatique ne recharge pas nginx : l'utilisateur du déploiement n'a pas les droits sur les certificats.
- Je fournirai le fichier et les commandes exactes.

**Ordre de mise en place sans rien casser** :
1. L'API commence à signer les liens. L'accès non signé reste ouvert, donc rien ne casse.
2. On vérifie sur le site et sur le mobile que tout s'affiche.
3. On ferme l'accès non signé (nginx, puis Spaces).

## 5. Décisions à prendre
1. **Photos d'état des lieux et d'inventaire** (intérieur des logements) : privées ? *Recommandation : oui.*
2. **Photo de profil des locataires** : privée ? *Recommandation : oui (visage + lien avec un logement).*
3. **Avatars des utilisateurs et des propriétaires** : publics ou privés ? *Recommandation : privés aussi, par simplicité. Seules les photos de biens restent publiques.*
4. **Durée de validité d'un lien** : *recommandation : 1 heure*. Plus court, un document laissé ouvert longtemps ne se rechargerait pas. Plus long, un lien qui circule reste utilisable plus longtemps.
5. **Accès existants** : aucun lien déjà envoyé à un client (e-mail, WhatsApp) ne doit-il continuer à fonctionner ? Une fois l'accès fermé, ces anciens liens cesseront de marcher.
   - Les quittances et documents restent accessibles depuis le site et l'application.
   - Si vous envoyez des liens directs aux locataires par e-mail, il faudra une page de téléchargement à la place (à confirmer).

## 6. Vérification à faire sur la production (lecture seule)
Pour savoir où sont réellement vos fichiers :
```sql
SELECT 'documents' AS t, left(url, 35) AS debut, count(*) FROM documents GROUP BY 1, 2
UNION ALL SELECT 'quittances', left(quittance_url, 35), count(*) FROM payments WHERE quittance_url IS NOT NULL GROUP BY 1, 2
UNION ALL SELECT 'pieces', left(photo_piece_url, 35), count(*) FROM tenants WHERE photo_piece_url <> '' GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

Si les liens commencent par `/uploads/`, les fichiers sont sur le disque du VPS. S'ils commencent par `https://…digitaloceanspaces.com`, ils sont sur Spaces.

## 7. Autres constats
- **⚠️ Photos du disque probablement introuvables à cause de nginx (S8, plus grave que prévu).**
  - **Le mécanisme.** Dans `nginx/hopegestion.conf`, la règle des fichiers statiques du site (`location ~* \.(js|css|png|jpg|jpeg|gif|svg|…)$`, avec `try_files $uri =404`) est une règle par motif. nginx la préfère toujours à la règle par préfixe `location /uploads/`.
  - **La conséquence.** Une demande `/uploads/properties/photo.jpg` est cherchée dans `frontend/dist/uploads/…`, où elle n'existe pas, et renvoie **404**, même si le fichier est bien dans `backend/uploads/`. Les PDF (quittances, baux) et les WEBP ne sont pas concernés.
  - **Le lien possible.** Si la configuration réelle du VPS est celle du dépôt (à confirmer), cela peut expliquer une partie des **photos « perdues »** attribuées à la suspension du serveur.
  - **Vérification sur le VPS.** Comparer `ls /var/www/hopegestion/backend/uploads/properties | head` avec l'affichage de l'une de ces photos dans le navigateur. Si le fichier existe sur le disque mais que le navigateur reçoit une erreur 404, c'est cette règle.
  - **Correction.** Une ligne : `location ^~ /uploads/ {` (le `^~` donne priorité à ce préfixe sur les règles par motif). Puis `sudo nginx -t && sudo systemctl reload nginx`. Indépendante du reste, elle peut être faite tout de suite.
- **Cache 30 jours.** `/uploads/` est servi avec `Cache-Control: public` pour 30 jours. Pour les dossiers privés, ce cache devra devenir `private`, faute de quoi un proxy intermédiaire pourrait garder une copie.
