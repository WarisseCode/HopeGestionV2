// backend/utils/signedFiles.ts
//
// Liens temporaires signés pour les fichiers privés de /uploads (audit S7,
// docs/suivi/INVENTAIRE_FICHIERS_2026-11-19.md).
//
// Principe : les liens restent enregistrés tels quels en base (« /uploads/receipts/x.pdf »).
// Au moment où l'API répond, chaque lien vers un dossier privé reçoit une date
// d'expiration et une signature : « /uploads/receipts/x.pdf?exp=…&sig=… ». Le site et
// l'application mobile utilisent déjà le lien fourni par l'API : ils n'ont rien à changer.
//
// Seules les photos des biens (dossier « properties ») restent publiques : les annonces
// publiques des lots vacants les affichent sans connexion.

import crypto from 'crypto';

/** Dossiers de /uploads servis sans signature. */
const PUBLIC_FOLDERS = new Set(['properties']);

/** Durée minimale de validité d'un lien (décision utilisateur : 1 h). */
const MIN_VALIDITY_S = 60 * 60;

/**
 * L'expiration est arrondie à la demi-heure supérieure : un même fichier garde le même
 * lien pendant 30 min. Sans cela, chaque réponse de l'API produirait un lien différent
 * et le navigateur / le mobile re-téléchargeraient toutes les images à chaque page.
 * Validité réelle : entre 1 h et 1 h 30.
 */
const WINDOW_S = 30 * 60;

// Clé de signature dérivée de JWT_SECRET (déjà présent partout) : aucune nouvelle
// variable à configurer sur le VPS. Le libellé sépare cet usage de celui des jetons.
let cachedKey: Buffer | null = null;
let cachedFrom: string | undefined;
function signingKey(): Buffer {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET manquant : impossible de signer les liens de fichiers');
    if (!cachedKey || cachedFrom !== secret) {
        cachedKey = crypto.createHmac('sha256', secret).update('hopegestion:file-url:v1').digest();
        cachedFrom = secret;
    }
    return cachedKey;
}

function computeSig(path: string, exp: number): string {
    // 128 bits suffisent (lien à durée de vie courte) et gardent les URL lisibles.
    return crypto.createHmac('sha256', signingKey()).update(`${path}\n${exp}`).digest('base64url').slice(0, 22);
}

/**
 * Chemin de fichier privé ? « /uploads/<dossier>/… » hors dossiers publics.
 * Refuse tout chemin contenant « .. » ou un segment vide suspect.
 */
export function isPrivateUploadPath(path: string): boolean {
    if (!path.startsWith('/uploads/') || path.includes('..')) return false;
    const folder = path.slice('/uploads/'.length).split('/')[0] ?? '';
    return folder.length > 0 && !PUBLIC_FOLDERS.has(folder);
}

/** Date d'expiration pour un lien produit maintenant (secondes Unix). */
export function expiryFor(nowMs = Date.now()): number {
    const minExp = Math.floor(nowMs / 1000) + MIN_VALIDITY_S;
    return Math.ceil(minExp / WINDOW_S) * WINDOW_S;
}

/** « /uploads/x/y.pdf » → « /uploads/x/y.pdf?exp=…&sig=… ». */
export function signUploadPath(path: string, nowMs = Date.now()): string {
    const exp = expiryFor(nowMs);
    return `${path}?exp=${exp}&sig=${computeSig(path, exp)}`;
}

/** Vérifie une signature (utilisé à l'étape 3, quand l'accès non signé sera fermé). */
export function verifyUploadSignature(path: string, exp: unknown, sig: unknown, nowMs = Date.now()): boolean {
    if (typeof exp !== 'string' || typeof sig !== 'string' || !/^\d{1,12}$/.test(exp)) return false;
    const expNum = Number(exp);
    if (expNum * 1000 < nowMs) return false;
    const expected = Buffer.from(computeSig(path, expNum));
    const given = Buffer.from(sig);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Lien complet vers /uploads : relatif (« /uploads/… ») ou absolu (« https://hôte/uploads/… »),
// avec une éventuelle chaîne de requête (ancienne signature) à remplacer.
const UPLOAD_URL = /^((?:https?:\/\/[^/?#\s]+)?)(\/uploads\/[^?#\s]+)(\?[^#\s]*)?$/;

/** Signe une chaîne si c'est un lien vers un fichier privé ; sinon la renvoie telle quelle. */
export function signIfPrivate(value: string, nowMs = Date.now()): string {
    const m = UPLOAD_URL.exec(value);
    const origin = m?.[1] ?? '';
    const path = m?.[2];
    if (!path || !isPrivateUploadPath(path)) return value;
    return origin + signUploadPath(path, nowMs);
}

/** Retire une signature (exp/sig) d'un lien vers /uploads, pour l'enregistrer propre. */
export function stripSignature(value: string): string {
    const m = UPLOAD_URL.exec(value);
    const query = m?.[3];
    if (!m || !query) return value;
    const kept = new URLSearchParams(query.slice(1));
    kept.delete('exp');
    kept.delete('sig');
    const rest = kept.toString();
    return (m[1] ?? '') + (m[2] ?? '') + (rest ? `?${rest}` : '');
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
    if (v === null || typeof v !== 'object') return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
};

/**
 * Applique `fn` à toutes les chaînes d'une valeur JSON (objets simples et tableaux).
 * Copie seulement ce qui change : les objets d'origine ne sont JAMAIS modifiés (certains
 * proviennent de caches serveur partagés entre utilisateurs). Les objets non simples
 * (Date, Buffer…) sont laissés tels quels.
 */
export function mapStringsDeep(value: unknown, fn: (s: string) => string, depth = 0): unknown {
    if (typeof value === 'string') return fn(value);
    if (depth > 20) return value; // garde-fou contre une structure anormalement profonde
    if (Array.isArray(value)) {
        let out: unknown[] | null = null;
        for (let i = 0; i < value.length; i++) {
            const next = mapStringsDeep(value[i], fn, depth + 1);
            if (next !== value[i]) {
                if (!out) out = value.slice();
                out[i] = next;
            }
        }
        return out ?? value;
    }
    if (isPlainObject(value)) {
        let out: Record<string, unknown> | null = null;
        for (const key of Object.keys(value)) {
            const next = mapStringsDeep(value[key], fn, depth + 1);
            if (next !== value[key]) {
                if (!out) out = { ...value };
                out[key] = next;
            }
        }
        return out ?? value;
    }
    return value;
}
