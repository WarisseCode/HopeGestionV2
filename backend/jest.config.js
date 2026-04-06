/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: { module: 'commonjs' }
        }],
    },
    // Timeout par test (routes peuvent être lentes en CI)
    testTimeout: 15000,
    // Évite les erreurs de connexion DB dans les tests unitaires
    setupFiles: ['<rootDir>/tests/setup.ts'],
};
