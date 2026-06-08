// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Plain JS config files (jest.config.js, etc.) — CommonJS globals only, no TS rules
  {
    files: ['*.js', '*.cjs'],
    ...eslint.configs.recommended,
    languageOptions: { globals: { ...globals.node, ...globals.commonjs } },
  },
  // TypeScript source: full recommended ruleset + custom overrides
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // Warn on explicit `any` — visible in CI without blocking the build.
      // Target: progressively replace with `unknown` or entity types from
      // shared/types/index.ts. Use `import type { Locataire }` in route files.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused vars: ignore underscore-prefixed (conventional for unused params).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Allow require() in the CommonJS backend.
      '@typescript-eslint/no-require-imports': 'off',

      // Empty catch blocks are intentional in some retry/cleanup paths.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // SQL query params are migrated incrementally — disable unsafe-* for now.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
);
