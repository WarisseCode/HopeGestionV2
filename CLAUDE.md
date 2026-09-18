## Instructions permanentes

- Toujours expliquer le "pourquoi" avant de générer du code
- Commenter les patterns non évidents


## Journal d'évolution du projet

Après CHAQUE tâche terminée (fonctionnalité, correction, refactorisation, changement de config), mets à jour le fichier `docs/JOURNAL_PROJET.md` avant de conclure ta réponse.

### Règles
1. Ne supprime et ne réécris jamais une entrée existante, sauf pour changer son statut.
2. Ajoute les nouvelles entrées à la fin du fichier, avec un identifiant incrémental (T-001, T-002...).
3. Si une tâche modifie ou remplace une tâche antérieure :
   - change le statut de l'ancienne entrée en `Modifiée (voir T-XXX)`
   - crée une nouvelle entrée qui référence l'ancienne et explique pourquoi elle change.
4. Si le fichier n'existe pas, crée le dossier `docs/` et le fichier avec l'en-tête ci-dessous, puis rédige d'abord l'entrée T-000 (état initial) avant d'enregistrer la tâche en cours sous T-001.
5. Reste factuel et concis. Ce journal servira de base au rapport final.
6. L'entrée T-000 est un cas particulier : elle se place juste après l'en-tête, avant T-001, et ne se modifie plus une fois écrite.

### Contenu de T-000 « État initial du projet »
Base-toi sur l'analyse du code et sur `git log` (s'il existe) pour documenter :
- l'objectif du projet et son périmètre
- la stack technique et les dépendances principales
- l'arborescence et les modules/fonctionnalités déjà présents
- l'architecture (backend, frontend, base de données, déploiement)
- les grandes étapes passées, avec dates approximatives (d'après `git log`)
- les points fragiles, dettes techniques ou éléments incomplets constatés
- la manière dont tu as exploré le projet pour établir cet état des lieux

Si une information est déduite plutôt que certaine, signale-le par « (à confirmer) ».

### Format d'une entrée
```
### T-XXX : Titre court
- **Date** : AAAA-MM-JJ
- **Statut** : Terminée | Modifiée (voir T-XXX) | Annulée
- **Type** : Fonctionnalité | Correction | Refactorisation | Config | Documentation
- **Description** : ce qui a été fait, en 2-3 phrases
- **Fichiers touchés** : liste des fichiers créés/modifiés
- **Décisions & justifications** : pourquoi ce choix technique
- **Problèmes rencontrés** : blocages et solutions (si applicable)
- **Remplace / modifie** : T-XXX (si applicable)
```

### En-tête du fichier
```
# Journal d'évolution du projet
Mis à jour automatiquement après chaque tâche.
```