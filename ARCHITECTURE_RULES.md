# Règles d'Architecture du Projet (INVIOLABLES)

Ce document liste les règles fondamentales et inviolables du projet. À chaque nouvelle session ou nouvelle tâche, je dois relire ce fichier et confirmer que je l'ai lu avant de commencer à coder.

## 1. RÈGLE TENANT ISOLATION

Toute requête vers la base de données **DOIT** inclure un filtre sur l'identifiant du tenant (`agency_id` / `owner_id`).
**Aucune exception n'est tolérée.**

- Toute fonction, service ou repository qui interroge la DB doit obligatoirement recevoir le `tenant_id` en paramètre ou le lire avec certitude depuis le contexte de la requête.
- Il est strictement interdit d'exécuter des requêtes globales non filtrées par le tenant.

## 2. RÈGLE ANTI-RÉGRESSION

- **Avant modification** : Avant de modifier un module existant, vérifier d'abord que les tests existants pour ce module passent sans erreur.
- **Après modification** : Après avoir modifié du code, il faut impérativement ajouter de nouveaux tests pour couvrir les nouveaux cas, ou mettre à jour les tests correspondants.

## 3. RÈGLE DE REVUE

Avant de répondre "c'est corrigé" à l'utilisateur, je m'engage à :
- Montrer le diff exact des lignes qui ont été modifiées.
- Confirmer de manière explicite que le filtre tenant est bien présent dans ces modifications (en lien avec la Règle 1).
