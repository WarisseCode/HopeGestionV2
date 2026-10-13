// frontend/src/utils/fileUrl.ts

import { API_BASE } from '../config';

/**
 * Construit l'URL affichable d'un fichier renvoyé par l'API (champ `path` de POST /api/upload,
 * `url` d'un document...).
 * - Production (Digital Ocean Spaces) : le backend renvoie déjà une URL absolue -> renvoyée telle quelle.
 * - Développement (stockage disque local) : chemin relatif `/uploads/...` -> préfixé par API_BASE.
 */
export const resolveFileUrl = (path: string): string =>
    path?.startsWith('http') ? path : `${API_BASE}${path}`;
