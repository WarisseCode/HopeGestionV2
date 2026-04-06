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

// 🔒 SECURITY: Refresh token secret (distinct du JWT_SECRET)
// Si absent, on dérive un secret différent du JWT_SECRET pour éviter la réutilisation inter-tokens.
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (secret + '_refresh');

// Durées des tokens
export const ACCESS_TOKEN_EXPIRES_IN  = process.env.JWT_EXPIRES_IN        || '15m';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
