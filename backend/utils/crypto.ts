// backend/utils/crypto.ts
// Chiffrement symétrique AES-256-GCM (confidentialité + authenticité) pour les données
// sensibles (CdC §XVII.3). Primitive réutilisable : encrypt/decrypt de chaînes.
//
// Clé : variable d'environnement ENCRYPTION_KEY.
//   - 64 caractères hexadécimaux  -> clé 32 octets directe ;
//   - 32 octets en base64         -> clé directe ;
//   - sinon (passphrase libre)    -> dérivation scrypt en 32 octets.
// ⚠️ En production, définir ENCRYPTION_KEY (idéalement 64 hex). Sans clé, une clé de
// développement est dérivée (NON sûre) et un avertissement est journalisé.

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96 bits, recommandé pour GCM

let warned = false;

function getKey(): Buffer {
    const raw = process.env.ENCRYPTION_KEY || '';
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    const asB64 = Buffer.from(raw, 'base64');
    if (asB64.length === 32) return asB64;
    if (!raw && !warned) {
        warned = true;
        console.warn('[CRYPTO] ENCRYPTION_KEY non définie : clé de développement dérivée (NON sûre en production).');
    }
    // Dérivation déterministe depuis la passphrase (sel fixe applicatif).
    return crypto.scryptSync(raw || 'hopegestion-dev-key', 'hopegestion-salt', 32);
}

// Préfixe de format pour distinguer un texte chiffré d'un texte en clair.
const PREFIX = 'enc:v1:';

/** Chiffre une chaîne. Retourne `enc:v1:<iv>.<tag>.<ciphertext>` (base64). */
export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

/** Indique si une valeur a été produite par encrypt(). */
export function isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Déchiffre une valeur produite par encrypt(). Si la valeur n'est pas chiffrée, la renvoie telle quelle. */
export function decrypt(token: string): string {
    if (!isEncrypted(token)) return token;
    const body = token.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = body.split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Format chiffré invalide');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
