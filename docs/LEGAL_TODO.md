# CGU / CGV / Mentions Légales / Conditions de Réservation — à compléter

Intégrées le 2026-07-22 à partir du document fourni (`Conditions Générales d'Utilisation.pdf`),
qui contenait plusieurs champs encore vides. Ils sont marqués visuellement « à compléter » sur
les pages publiques concernées (`/cgu`, `/mentions-legales`). Liste complète ci-dessous.

## Champs à fournir

| Document | Champ | Où |
|---|---|---|
| CGU | Numéro RCCM de SKILLEXIE S.E.P | Section 1 (Droit du nom commercial) + pied de page |
| CGU | Numéro IFU | Pied de page |
| CGU | Adresse précise (« Carré … », Cotonou) | Pied de page |
| CGU | Date de première mise en ligne | Section 6 (Modification des CGU) |
| Mentions Légales | Adresse complète du siège social à Bohicon | Section 1 (Éditeur) |
| Mentions Légales | Nom, adresse, téléphone, site web de l'hébergeur | Section 3 (Hébergement) |

## Point à trancher : réservation réelle vs. texte des Conditions de Réservation

Le texte fourni décrit un paiement immédiat de l'acompte (5 %) par mobile money/carte/virement,
réservation valide seulement après confirmation du paiement, montant non remboursable si
l'échéance n'est pas respectée. Le flux réellement implémenté (`PublicReservation.tsx`) est
différent : une demande est soumise, puis la réservation reste en attente 48h le temps que le
gestionnaire la valide manuellement — le paiement de l'acompte n'est pas prélevé au moment de la
demande. À réconcilier : soit le texte doit être ajusté pour refléter le flux réel, soit le flux
doit évoluer vers un paiement immédiat pour correspondre au texte déjà validé juridiquement.

## Point à trancher : incohérence d'adresse

Le document source indique **Cotonou, Bénin** dans le pied de page des CGU, mais **Bohicon**
comme siège social dans les Mentions Légales. Ce sont deux villes différentes au Bénin — à
clarifier : est-ce le même siège social (une des deux adresses est une erreur), ou deux adresses
distinctes (ex. siège social vs adresse d'exploitation) ? Les deux pages reflètent le document
source tel quel en attendant.

## Contenu non fourni

- **Politique de Confidentialité** : mentionnée dans les Mentions Légales (point 5) mais jamais
  transmise comme document séparé. Le lien "Confidentialité" a été retiré du footer en attendant
  ce texte (il n'y a rien à afficher pour l'instant).
- **Page "Cookies" dédiée** : le contenu existe déjà (CGU section 7 : "le site ne présente aucun
  cookie") mais il n'y a pas de page séparée — le lien correspondant a été retiré du footer.

## Décisions techniques prises pendant l'intégration

- Version en vigueur des CGU fixée à `2026-07-22` (`backend/config/config.ts`,
  `CGU_CURRENT_VERSION`) — à incrémenter (nouvelle date) à chaque révision substantielle du texte,
  pas pour un simple remplissage de champ « à compléter ».
- Consentement appliqué via un seul garde-fou (`CguGate.tsx`, autour de toutes les routes
  authentifiées) plutôt que des cases à cocher dupliquées à l'inscription et à l'acceptation
  d'invitation — couvre uniformément inscription directe, invitation, Google OAuth et comptes
  déjà existants.
- Deux corrections de forme sans impact sur le fond : renumérotation des sections CGU (le
  document source dupliquait "4-" pour deux sections distinctes) et correction d'une négation
  manquante ("le site ne présente aucun cookie").
- Domaine `hopegestion.com` renseigné où le document source indiquait "…...com".
- Téléphone (0161280346 / 0166962026) et email (10xsuperieur@gmail.com) réutilisés depuis les
  Mentions Légales pour les points de contact CGU laissés vides dans le document source (même
  société, mêmes coordonnées déjà fournies ailleurs dans le document).
