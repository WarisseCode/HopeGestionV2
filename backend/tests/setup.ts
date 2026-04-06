// tests/setup.ts
// Variables d'environnement minimales pour que les modules (config, middleware)
// s'initialisent sans erreur fatale pendant les tests unitaires.

process.env.JWT_SECRET            = 'test-secret-at-least-32-characters-long!!';
process.env.REFRESH_TOKEN_SECRET  = 'test-refresh-secret-at-least-32-chars!!';
process.env.NODE_ENV              = 'test';
process.env.DATABASE_URL          = 'postgresql://test:test@localhost:5432/test';
