// backend/config/apiDocs.ts
// Audit S8 : la documentation Swagger décrivait toute l'API à n'importe quel visiteur.
// Règle : servie partout sauf en production, où il faut l'activer explicitement
// (API_DOCS_ENABLED=true dans .env, par exemple le temps d'un travail d'intégration).
export function isApiDocsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NODE_ENV !== 'production' || env.API_DOCS_ENABLED === 'true';
}
