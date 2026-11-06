# Plan d'action — Audit Frontend HopeGestionV2
**Date :** Avril 2026  
**Statut global :** ✅ Terminé (48/48 — complet)

---

## Légende
- 🔴 À faire
- 🟡 En cours
- ✅ Terminé
- 🐛 Bug
- ♿ Accessibilité
- 🎨 UI/UX
- 🧹 Nettoyage
- ⚠️ Données / Logique

---

## PHASE 1 — Bugs critiques (impact immédiat sur le rendu ou la navigation)

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 1.1 | ✅ | 🐛 | `Biens.tsx` | Template literal échappé `\${...}` → classNames conditionnels jamais appliqués |
| 1.2 | ✅ | 🐛 | `Locataires.tsx` | Même bug template literal `\${...}` |
| 1.3 | ✅ | 🐛 | `Finances.tsx` | Même bug template literal `\${...}` |
| 1.4 | ✅ | 🐛 | `LocataireDashboard.tsx` | CTA "Payer maintenant" navigue vers `/dashboard/finances/mobile-money` (route 404) → corriger en `/dashboard/mobile-money` |
| 1.5 | ✅ | 🐛 | `LocataireDashboard.tsx` | `joursAvantEcheance` utilise `Math.abs()` → paiement en retard affiché comme futur — supprimer `Math.abs()`, ajouter état "En retard" |
| 1.6 | ✅ | 🐛 | `GestionnaireDashboard.tsx` | Bouton "Actualiser" (icône RefreshCw) sans handler `onClick` — connecter au `refetch` TanStack Query |
| 1.7 | ✅ | 🐛 | `PublicNavbar.tsx` | Lien "Biens disponibles" pointe vers `/biens` → corriger en `/biens-disponibles` |
| 1.8 | ✅ | 🐛 | `ForgotPassword.tsx` | Faute de frappe dans le message de succès : "Email en envoyé !" → "Email envoyé !" |
| 1.9 | ✅ | 🐛 | `Biens.tsx` | `z-25` utilisé sur un overlay — pas une valeur Tailwind valide (remplacer par `z-30`) |
| 1.10 | ✅ | ⚠️ | `GestionnaireDashboard.tsx` | `revenuNet` = `totalRevenus - 0` — les dépenses ne sont pas soustraites — corriger le calcul ou renommer le label en "Revenus bruts" |
| 1.11 | ✅ | ⚠️ | `Alert.tsx` | Couleur icône `text-info-content` = blanc sur fond clair → icônes invisibles — remplacer par `text-info`, `text-success`, `text-warning`, `text-error` |

---

## PHASE 2 — Accessibilité (WCAG 2.1)

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 2.1 | ✅ | ♿ | `Modal.tsx` | Ajouter `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant vers le titre h2 |
| 2.2 | ✅ | ♿ | `ConfirmModal.tsx` | Même correction ARIA que Modal + utiliser `role="alertdialog"` pour les confirmations destructives |
| 2.3 | ✅ | ♿ | `SearchPalette.tsx` | Ajouter `role="dialog"`, `aria-modal="true"`, `aria-label="Recherche rapide"` |
| 2.4 | ✅ | ♿ | `Header.tsx` | Ajouter `aria-label="Profil utilisateur"` + `onKeyDown` (Enter/Space) sur le bouton profil dropdown |
| 2.5 | ✅ | ♿ | `Card.tsx` | Ajouter `onKeyDown` (Enter/Space) quand `onClick` est fourni — sinon `role="button"` non activable clavier |
| 2.6 | ✅ | ♿ | `Button.tsx` | Remplacer `focus:ring-2` par `focus-visible:ring-2` pour ne pas afficher le ring au clic souris |
| 2.7 | ✅ | ♿ | `Input.tsx` | Quand une erreur est présente, conserver l'icône endIcon (ex : toggle mot de passe) — ne pas la remplacer par l'icône d'erreur |
| 2.8 | ✅ | ♿ | `PublicFooter.tsx` | Ajouter `<label htmlFor="newsletter-input">` ou `aria-label` sur le champ newsletter |
| 2.9 | ✅ | ♿ | `Biens.tsx` | Ajouter des attributs `alt` significatifs sur les images de biens (nom du bien + ville) |

---

## PHASE 3 — UX & Navigation

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 3.1 | ✅ | 🎨 | `PublicNavbar.tsx` | Ajouter menu hamburger mobile (drawer ou dropdown) pour les écrans < `lg` |
| 3.2 | ✅ | 🎨 | `Sidebar.tsx` | Fermer le sidebar mobile au clic sur le backdrop (overlay) |
| 3.3 | ✅ | 🎨 | `Finances.tsx` | Ajouter un état visuel "verrouillé" sur les onglets PRO (icône cadenas + opacité réduite) au lieu d'un toast silencieux |
| 3.4 | ✅ | 🎨 | `LocataireDashboard.tsx` | Afficher la vraie photo du bien quand disponible (ne pas forcer le placeholder) |
| 3.5 | ✅ | 🎨 | `SignupForm.tsx` | Ajouter un indicateur de force de mot de passe |
| 3.6 | ✅ | 🎨 | `SignupForm.tsx` | Ajouter une explication pour les visiteurs qui souhaitent s'inscrire en tant que propriétaire (ex : "Contactez votre gestionnaire") |
| 3.7 | ✅ | 🎨 | `LoginForm.tsx` | Remplacer `window.location.href = '/dashboard'` (post-Google OAuth) par `useNavigate()` pour cohérence SPA |
| 3.8 | ✅ | 🎨 | `App.tsx` | Créer une page 404 custom au lieu du redirect silencieux vers `/` |
| 3.9 | ✅ | 🎨 | `AdminLayout.tsx` | Ajouter la gestion mobile (BottomNav ou sidebar collapsible) pour le panneau admin |
| 3.10 | ✅ | 🎨 | `SearchPalette.tsx` | Étendre la recherche aux données live (locataires, biens, locations) — pas uniquement les routes statiques |

---

## PHASE 4 — Incohérences de composants

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 4.1 | ✅ | 🎨 | `ForgotPassword.tsx` | Remplacer `input input-bordered` et `btn btn-primary` bruts par `Input` et `Button` custom |
| 4.2 | ✅ | 🎨 | `ForgotPassword.tsx` | Remplacer le SVG inline par l'icône `lucide-react` équivalente |
| 4.3 | ✅ | 🎨 | `SignupForm.tsx` | Remplacer `card-body` DaisyUI brut par le composant `Card` custom |
| 4.4 | ✅ | 🎨 | `Finances.tsx` | Remplacer `select select-bordered` brut dans le formulaire de paiement par le composant `Select` custom |
| 4.5 | ✅ | 🎨 | `Contrats.tsx` | Remplacer `<input>` brut de recherche par le composant `SearchInput` |
| 4.6 | ✅ | 🎨 | `ProprietaireDashboard.tsx` | Supprimer le composant `KPI` local, importer `KPICard` depuis `/components/dashboard/KPICard.tsx` |
| 4.7 | ✅ | 🎨 | `GestionnaireDashboard.tsx` | Remplacer `from-indigo-600 via-indigo-700 to-purple-700` par `from-primary via-primary to-secondary` dans la bannière financière |
| 4.8 | ✅ | 🎨 | `AdminDashboard.tsx` | Remplacer les gradients hardcodés (`from-blue-500`, `from-emerald-500`, etc.) par les tokens design (`from-primary`, `from-success`, etc.) |
| 4.9 | ✅ | 🎨 | `AdminLayout.tsx` | Rendre le badge de notification data-driven (ne pas afficher si 0 notifications) |

---

## PHASE 5 — Données & Logique

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 5.1 | ✅ | ⚠️ | `Contrats.tsx` | Connecter la page à la vraie API (contrats de location + vente) — supprimer les données mockées hardcodées |
| 5.2 | ✅ | ⚠️ | `Locataires.tsx` | Supprimer commentaire "In real app…" — le champ `payment_status` vient bien de l'API |
| 5.3 | ✅ | ⚠️ | `Locataires.tsx` | `getAvatarColor()` — augmenter l'entropie (utiliser le nom complet, pas seulement le premier caractère) |
| 5.4 | ✅ | ⚠️ | `PublicFooter.tsx` | Formulaire newsletter : toast "Bientôt disponible" en attendant l'API |
| 5.5 | ✅ | ⚠️ | `PublicFooter.tsx` | Liens morts remplacés par des `<span>` avec badge "Bientôt" |

---

## PHASE 6 — Nettoyage & Architecture CSS

| # | Statut | Type | Fichier | Description |
|---|---|---|---|---|
| 6.1 | ✅ | 🧹 | `src/App.css` | Supprimé — fichier orphelin jamais importé |
| 6.2 | ✅ | 🧹 | `src/theme/Theme.tsx` | Supprimé — wrapper no-op retiré de `App.tsx` |
| 6.3 | ✅ | 🧹 | Dark mode | Les 3 points de toggle (`Header`, `CompteProfil`, `UserContext`) synchronisent déjà `data-theme` + classe `.dark` — système unifié |
| 6.4 | ✅ | 🧹 | `Select.tsx` | `dangerouslySetInnerHTML` remplacé par découpage React sécurisé (regex escape + `<mark>` elements) |

---

## Récapitulatif

| Phase | Nb d'items | Statut |
|---|---|---|
| Phase 1 — Bugs critiques | 11 | ✅ Terminée |
| Phase 2 — Accessibilité | 9 | ✅ Terminée |
| Phase 3 — UX & Navigation | 10 | ✅ Terminée |
| Phase 4 — Incohérences composants | 9 | ✅ Terminée |
| Phase 5 — Données & Logique | 5 | ✅ Terminée |
| Phase 6 — Nettoyage | 4 | ✅ Terminée |
| **Total** | **48 items** | **48/48 résolus** |
