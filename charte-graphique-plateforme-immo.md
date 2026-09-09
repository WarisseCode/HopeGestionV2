# Charte Graphique & Design System
## Plateforme SaaS de gestion immobilière pour agences

**Statut du document** : Vivant / évolutif — à compléter au fur et à mesure des décisions produit.
**Dernière mise à jour** : 05/09/2026
**Version** : 1.0

---

## Sommaire

1. [Positionnement & intention de marque](#1-positionnement--intention-de-marque)
2. [Palette de couleurs](#2-palette-de-couleurs)
3. [Typographie](#3-typographie)
4. [Règles d'usage des couleurs](#4-règles-dusage-des-couleurs)
5. [Accessibilité](#5-accessibilité)
6. [Tokens techniques (CSS)](#6-tokens-techniques-css)
7. [Logo & déclinaisons](#7-logo--déclinaisons)
8. [À compléter ultérieurement](#8-à-compléter-ultérieurement)

---

## 1. Positionnement & intention de marque

| Critère | Détail |
|---|---|
| **Type de plateforme** | SaaS B2B — outil métier quotidien, pas un site vitrine |
| **Cible** | Agences immobilières, gestionnaires de biens, property managers |
| **Usage** | Utilisation intensive, prolongée (plusieurs heures/jour) → priorité à la lisibilité et au confort visuel |
| **Ton de marque** | Professionnel, moderne, digne de confiance, orienté data/performance |
| **Différenciation** | Se démarquer du bleu institutionnel générique du secteur bancaire/assurance/immobilier classique |
| **Palette retenue** | **Palette 2 — "Tech immobilier moderne"** (vert émeraude + anthracite + corail) |
| **Justification du choix** | Évoque la croissance, la stabilité et une dimension "green building"/durable, tout en restant contemporain et adapté à une interface dense (dashboards, tableaux, data) |

---

## 2. Palette de couleurs

### 2.1 Light Mode (référence par défaut)

| Rôle / Token | Couleur (HEX) | Usage |
|---|---|---|
| Background principal | `#F4F6F5` | Fond de page |
| Surface (cards, panels) | `#FFFFFF` | Cartes, tableaux, modales |
| Primaire | `#0F5D4E` | Boutons principaux, liens actifs, éléments de marque |
| Primaire — hover | `#0B4A3E` | État hover/focus des éléments primaires |
| Secondaire | `#2B2D33` | Sidebar, headers, éléments de structure |
| Accent | `#E8724C` | CTA secondaires, badges, notifications |
| Texte principal | `#1A1C1E` | Corps de texte |
| Texte secondaire | `#5B5F63` | Labels, métadonnées, texte d'aide |
| Bordures | `#E1E4E2` | Séparateurs, contours d'inputs |
| Succès | `#2E7D32` | Loyer payé, statut validé |
| Alerte | `#E0A800` | Échéance proche, action requise |
| Erreur | `#C0392B` | Impayé, échec, donnée bloquante |

### 2.2 Dark Mode

> ⚠️ Règle clé : ne jamais inverser une couleur claire en sa version sombre par simple symétrie — chaque teinte est retravaillée pour conserver un contraste suffisant.

| Rôle / Token | Couleur (HEX) | Usage |
|---|---|---|
| Background principal | `#14171A` | Fond de page (noir doux, pas de noir pur) |
| Surface (cards, panels) | `#1E2225` | Cartes, tableaux, modales |
| Surface — niveau 2 | `#252A2D` | Élévation intermédiaire (dropdowns, popovers) |
| Surface — niveau 3 | `#2C3236` | Élévation haute (modales au premier plan) |
| Primaire | `#3EA88A` | Version éclaircie du vert — garde le contraste sur fond sombre |
| Primaire — hover | `#57BFA1` | État hover/focus |
| Secondaire | `#3A3D42` | Sidebar, headers |
| Accent | `#F08962` | Corail éclairci pour rester lisible |
| Texte principal | `#EDEEEE` | Corps de texte |
| Texte secondaire | `#9A9EA2` | Labels, métadonnées |
| Bordures | `#2E3236` | Séparateurs, contours d'inputs |
| Succès | `#4CAF50` | Statut validé |
| Alerte | `#F2C14E` | Action requise |
| Erreur | `#E57373` | Statut bloquant |

### 2.3 Palettes alternatives (non retenues, conservées pour référence)

**Palette 1 — Confiance institutionnelle**
- Primaire : Bleu marine `#1B2A4A` · Secondaire : Bleu acier `#3D5A80` · Accent : Or/Bronze `#C9A15B`

**Palette 3 — Premium immobilier haut de gamme**
- Primaire : Bleu nuit `#0D1B2A` · Secondaire : Beige sable `#D9C7A3` · Accent : Cuivre `#B5651D`

---

## 3. Typographie

### 3.1 Familles retenues

| Usage | Police | Justification |
|---|---|---|
| Titres & UI | **Inter** ou **Manrope** | Geometric sans-serif, excellente lisibilité écran, variable font (légère en performance), standard des SaaS modernes (Linear, Notion) |
| Corps de texte / contenu long | **Inter** (même famille) | Simplifie la maintenance ; alternative : **IBM Plex Sans** pour une nuance plus corporate-tech |
| Chiffres & données (loyers, surfaces, prix) | **Inter** avec `font-variant-numeric: tabular-nums` | Indispensable pour aligner les colonnes de chiffres dans les tableaux |

### 3.2 Hiérarchie typographique

| Élément | Taille | Graisse | Line-height |
|---|---|---|---|
| H1 | 32–40px | Semi-bold (600) | 1.2 |
| H2 | 24px | Semi-bold (600) | 1.3 |
| H3 | 18–20px | Medium (500) | 1.4 |
| Corps de texte | 14–16px | Regular (400) | 1.5 |
| Labels / tableaux | 13px | Medium (500) | 1.4 |
| Texte d'aide / captions | 12px | Regular (400) | 1.4 |

> 📌 16px minimum recommandé pour le corps de texte principal (accessibilité).

### 3.3 Alternative "premium/chaleureuse" (si repositionnement futur vers Palette 3)

- Titres : **Fraunces** ou **Freight Display** (serif moderne, touche éditoriale)
- Corps : **Inter** ou **Söhne** en accompagnement

---

## 4. Règles d'usage des couleurs

- **Primaire (vert émeraude)** : réservé aux actions principales (CTA, liens actifs, éléments de navigation sélectionnés). Ne pas surutiliser en fond de larges surfaces.
- **Accent (corail)** : usage parcimonieux — badges, notifications, CTA secondaires. Ne doit jamais concurrencer visuellement le primaire.
- **Secondaire (anthracite)** : structure de l'interface (sidebar, headers), pas de contenu informatif dessus sans contraste vérifié.
- **Couleurs de statut** (succès/alerte/erreur) : usage strictement fonctionnel — jamais comme couleur décorative.
- **Ratio recommandé** : 60% neutres (backgrounds/surfaces) / 30% secondaire / 10% primaire+accent (règle 60-30-10 adaptée UI).

---

## 5. Accessibilité

- Contraste texte/fond : ratio minimum **4.5:1** (WCAG AA) pour tout texte standard, **3:1** pour le texte large (≥24px ou ≥19px bold).
- Ne jamais utiliser la couleur comme unique vecteur d'information (ex. statuts) — toujours coupler à une icône ou un label texte.
- Prévoir un **toggle manuel** light/dark (ne pas se fier uniquement à `prefers-color-scheme`), l'éclairage de bureau variant selon les agences.
- Tester les palettes avec un simulateur de daltonisme (notamment deutéranopie, la plus fréquente) avant validation finale.

---

## 6. Tokens techniques (CSS)

```css
:root {
  /* Light mode */
  --color-bg: #F4F6F5;
  --color-surface: #FFFFFF;
  --color-primary: #0F5D4E;
  --color-primary-hover: #0B4A3E;
  --color-secondary: #2B2D33;
  --color-accent: #E8724C;
  --color-text-primary: #1A1C1E;
  --color-text-secondary: #5B5F63;
  --color-border: #E1E4E2;
  --color-success: #2E7D32;
  --color-warning: #E0A800;
  --color-error: #C0392B;

  --font-family-base: 'Inter', sans-serif;
  --font-size-h1: 2.5rem;
  --font-size-h2: 1.5rem;
  --font-size-body: 1rem;
  --font-size-label: 0.8125rem;
}

[data-theme="dark"] {
  --color-bg: #14171A;
  --color-surface: #1E2225;
  --color-surface-2: #252A2D;
  --color-surface-3: #2C3236;
  --color-primary: #3EA88A;
  --color-primary-hover: #57BFA1;
  --color-secondary: #3A3D42;
  --color-accent: #F08962;
  --color-text-primary: #EDEEEE;
  --color-text-secondary: #9A9EA2;
  --color-border: #2E3236;
  --color-success: #4CAF50;
  --color-warning: #F2C14E;
  --color-error: #E57373;
}
```

---

## 7. Logo & déclinaisons

### 7.1 Principes directeurs

- **Fonctionner en mono-couleur** : le logo doit rester lisible et identifiable réduit à une seule teinte (noir, blanc, ou primaire), sans dégradé indispensable.
- **Lisible en très petit format** : test obligatoire à 16px (favicon) et 32px (app icon) — si les détails se perdent, simplifier le tracé.
- **Compatible light ET dark mode** : prévoir nativement une version pour fond clair et une pour fond sombre (pas juste une inversion automatique, un ajustement des contrastes si besoin).
- **Éviter le symbole "maison" littéral** (toit + porte) : iconographie sursaturée dans le secteur immobilier, faible différenciation.
- **Cohérence avec le vert émeraude / anthracite** de la Palette 2 retenue.

### 7.2 Direction retenue : B — Symbole "portefeuille de biens" ✅

**Concept final** : trois blocs aux angles arrondis, de tailles décroissantes, disposés en escalier ascendant (bas-gauche → haut-droite). Le bloc le plus grand (vert émeraude, couleur primaire) porte la majorité du poids visuel ; le bloc intermédiaire (anthracite) structure la composition ; le plus petit bloc (corail, accent) attire l'œil en position dominante.

**Sens de marque** :
- Les 3 blocs distincts = pluralité d'actifs gérés (portefeuille multi-biens, pas une maison unique) → cohérent avec un usage multi-agences/multi-biens
- La composition en escalier ascendant = croissance, performance, progression du portefeuille
- L'accent corail en point haut = signal d'action, dynamisme

**Validation effectuée** :
- ✅ Lisible à 16px (test favicon réel)
- ✅ Fonctionne en mono blanc (fond sombre) et mono anthracite (fond clair/print)
- ✅ Version dark mode dédiée (vert éclairci `#3EA88A`) pour garder le contraste sur fond `#14171A`
- ✅ Décliné en app icon carré (fond plein + symbole) pour PWA/mobile

**Directions non retenues, conservées pour référence** :

| Direction | Concept |
|---|---|
| A — Monogramme géométrique | Initiales en formes modulaires évoquant un plan d'immeuble / grille de dashboard |
| C — Wordmark seul | Nom de marque en typo custom, une lettre modifiée (ex. "O" en anneau) |

### 7.3 Structure du logo (une fois le concept validé)

- **Logo principal (horizontal)** : symbole + wordmark, pour header desktop, documents commerciaux, signatures email
- **Logo empilé (vertical/stacked)** : symbole au-dessus du wordmark, pour formats carrés (réseaux sociaux, splash screen)
- **Symbole seul (icône de marque)** : pour favicon, app icon, avatar, sidebar réduite/collapsed
- **Wordmark seul** : pour usages où l'espace horizontal est large mais la hauteur limitée (footer, documents PDF)

### 7.4 Déclinaisons colorimétriques obligatoires

| Version | Usage |
|---|---|
| Couleur (primaire vert `#0F5D4E` + anthracite `#2B2D33`) | Usage par défaut, fond clair |
| Monochrome blanc | Fond sombre, fond photo, fond coloré foncé |
| Monochrome noir/anthracite | Fond très clair, impression N&B, fax/documents administratifs |
| Version dark mode dédiée (si le symbole utilise le vert) | Remplacer `#0F5D4E` par `#3EA88A` (version éclaircie) pour garder le contraste sur fond `#14171A` |

### 7.5 Déclinaisons techniques (formats & tailles)

| Usage | Format | Taille / Résolution |
|---|---|---|
| Favicon | `.ico`, `.svg`, `.png` | 16×16, 32×32, 48×48 px |
| App icon (PWA / mobile) | `.png` | 192×192, 512×512 px (+ maskable icon pour Android) |
| Apple touch icon | `.png` | 180×180 px |
| Logo header web | `.svg` (vectoriel, prioritaire) | Hauteur ~24–32px dans l'UI |
| Logo documents/print | `.svg`, `.pdf`, `.eps` | Vectoriel, haute résolution |
| Réseaux sociaux (avatar) | `.png` | 400×400 px minimum |
| Open Graph / partage de lien | `.png`, `.jpg` | 1200×630 px |

### 7.6 Zone de protection & usages interdits

- **Zone de protection (clear space)** : conserver un espace libre autour du logo égal à la hauteur du symbole (ou de la lettre la plus haute du wordmark) — aucun élément graphique ou texte ne doit empiéter dans cette zone.
- **Taille minimale d'usage** : ne jamais descendre en dessous de 20px de hauteur pour la version complète (symbole + wordmark) hors favicon dédié.
- **Interdictions à formaliser une fois le logo créé** :
  - Ne pas déformer/étirer le logo (respecter le ratio)
  - Ne pas changer les couleurs en dehors des versions validées (§7.4)
  - Ne pas appliquer d'effets (ombre portée, dégradé non prévu, contour)
  - Ne pas placer le logo couleur sur un fond de faible contraste
  - Ne pas recomposer le symbole et le wordmark dans un agencement non prévu

### 7.7 Fichiers livrés (v1 — dossier `/brand-assets/logo/`)

| Fichier | Description |
|---|---|
| `symbol-color.svg` | Symbole seul, version couleur (light mode) |
| `symbol-mono-white.svg` | Symbole seul, mono blanc (fonds sombres) |
| `symbol-mono-dark.svg` | Symbole seul, mono anthracite (fonds clairs, print/N&B) |
| `symbol-color-darkmode.svg` | Symbole seul, couleurs éclaircies pour dark mode |
| `app-icon-square.svg` | Symbole sur fond plein émeraude, prêt pour PWA/mobile |
| `favicon-16.png` / `favicon-32.png` / `favicon-48.png` | Exports favicon aux tailles standards |
| `app-icon-192.png` / `app-icon-512.png` | Exports app icon PWA/Android |
| `apple-touch-icon-180.png` | Export icône iOS |
| `lockup-horizontal-placeholder.svg` | Symbole + wordmark en ligne — **texte "Votre Marque" à remplacer par le nom réel** |
| `lockup-stacked-placeholder.svg` | Symbole + wordmark empilé — **texte à remplacer** |
| `wordmark-only-placeholder.svg` | Wordmark seul en Inter SemiBold — **texte à remplacer** |
| `planche-apercu.png` | Planche de synthèse visuelle des déclinaisons |

> ⚠️ **En attente** : le nom de marque définitif n'a pas encore été communiqué. Les fichiers `lockup-*` et `wordmark-only` utilisent un texte "Votre Marque" à titre d'exemple — le symbole seul (`symbol-*.svg`, favicons, app icons) est en revanche final et indépendant du nom choisi.

### 7.8 Prochaines étapes

- [x] Choisir une direction conceptuelle → **Direction B retenue**
- [x] Décliner en versions couleur / mono blanc / mono noir / dark mode
- [x] Produire les exports favicon / app icon (16, 32, 48, 180, 192, 512px)
- [x] Valider la lisibilité à 16px
- [ ] Recevoir le nom de marque définitif pour finaliser le wordmark
- [ ] Régénérer les lockups horizontal/empilé avec le nom réel
- [ ] Test d'impression N&B (version mono anthracite)
- [ ] Versionner le dossier `/brand-assets/logo/` dans le dépôt du projet

---

## 8. À compléter ultérieurement

Sections prévues pour les prochaines itérations de ce document :

- [ ] Iconographie (style d'icônes, bibliothèque retenue)
- [ ] Composants UI (boutons, inputs, tableaux, modales, badges de statut)
- [ ] Grille & espacement (système de spacing, breakpoints responsive)
- [ ] Ton & voix rédactionnelle (microcopy, messages d'erreur, tone of voice)
- [ ] Illustrations & imagerie (style photo/illustration pour marketing)
- [ ] Déclinaisons marketing (landing page, réseaux sociaux, présentations commerciales)
- [ ] Guide d'accessibilité étendu (navigation clavier, ARIA, lecteurs d'écran)

---

*Document à faire évoluer conjointement avec l'équipe produit, design et développement.*
