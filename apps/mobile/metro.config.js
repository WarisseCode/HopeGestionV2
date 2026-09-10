// metro.config.js
// Configuration Metro pour le monorepo Turborepo
// Résout les packages @hopegestion/* depuis ../../packages/

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Indique à Metro de surveiller le répertoire racine du monorepo
config.watchFolders = [workspaceRoot];

// Résolution des modules : priorité au dossier mobile, puis aux packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Permet à Metro de traiter les fichiers TypeScript des packages internes
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

module.exports = config;
