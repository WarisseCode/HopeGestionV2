import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Global configuration for the backend
 */

// 🔒 SECURITY: Enforce strong JWT_SECRET
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
    console.error('❌ FATAL SECURITY ERROR: JWT_SECRET must be set in .env and be at least 32 characters long');
    console.error('   Generate a strong secret: openssl rand -base64 32');
    process.exit(1);
}

export const JWT_SECRET = secret;

// 🔒 SECURITY: Refresh token secret (distinct du JWT_SECRET).
// Actuellement non utilisé : les refresh tokens sont des octets aléatoires hashés en SHA-256 et
// stockés en base — ils ne sont pas signés en JWT. Cette variable est réservée si l'on passe
// un jour à des refresh tokens JWT. Elle requiert une valeur explicite pour empêcher tout usage
// accidentel avec un secret faible dérivé de JWT_SECRET.
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshSecret || refreshSecret.length < 32) {
    console.error('❌ FATAL SECURITY ERROR: REFRESH_TOKEN_SECRET must be set in .env and be at least 32 characters long');
    console.error('   Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}
export const REFRESH_TOKEN_SECRET = refreshSecret;

// Durées des tokens
export const ACCESS_TOKEN_EXPIRES_IN  = process.env.JWT_EXPIRES_IN        || '15m';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Version en vigueur des CGU (cf. cguRoutes.ts). À incrémenter (nouvelle date) à chaque
// révision substantielle du texte : ça déclenche une nouvelle demande de consentement pour
// tous les utilisateurs, même ceux ayant déjà accepté une version antérieure.
export const CGU_CURRENT_VERSION = '2026-07-22';
