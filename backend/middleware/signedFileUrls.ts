// backend/middleware/signedFileUrls.ts
//
// Branchement des liens signés (utils/signedFiles.ts) sur l'API.
//
//  - signFileUrlsInResponses : remplace, dans toute réponse JSON de l'API, chaque lien vers
//    un fichier privé par un lien signé valable au moins 1 h. Un seul point de passage
//    plutôt qu'une modification route par route : aucune route ne peut être oubliée
//    (baux, locataires, paiements, EDL, routes mobiles…).
//  - stripFileUrlSignatures : un formulaire peut renvoyer un lien signé reçu plus tôt
//    (ex. fiche locataire modifiée). On retire exp/sig à l'arrivée pour n'enregistrer
//    en base que le lien d'origine, qui ne périme jamais.
//  - serveUploadsWithSignature : vérification des signatures pour /uploads. ÉTAPE 1 :
//    désactivée par défaut (FILE_URLS_ENFORCE absent) → rien n'est bloqué. ÉTAPE 3 :
//    FILE_URLS_ENFORCE=true + nginx qui transmet les dossiers privés à Node.

import { Request, Response, NextFunction } from 'express';
import { mapStringsDeep, signIfPrivate, stripSignature, isPrivateUploadPath, verifyUploadSignature } from '../utils/signedFiles';

export function signFileUrlsInResponses(_req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);
    res.json = (body?: unknown) => {
        const now = Date.now();
        let signed = body;
        try {
            signed = mapStringsDeep(body, s => signIfPrivate(s, now));
        } catch (e) {
            // Ne jamais casser une réponse à cause de la signature : on renvoie l'original.
            console.error('[signedFileUrls] signature impossible, réponse envoyée telle quelle :', e);
        }
        return originalJson(signed);
    };
    next();
}

export function stripFileUrlSignatures(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
        req.body = mapStringsDeep(req.body, stripSignature);
    }
    next();
}

/** À monter devant express.static('/uploads'). */
export function serveUploadsWithSignature(req: Request, res: Response, next: NextFunction) {
    if (process.env.FILE_URLS_ENFORCE !== 'true') return next();
    // req.path est relatif au point de montage (« /receipts/x.pdf ») : on reconstruit le
    // chemin complet signé (« /uploads/receipts/x.pdf »).
    let fullPath: string;
    try {
        fullPath = '/uploads' + decodeURIComponent(req.path);
    } catch {
        return res.status(400).end();
    }
    if (!isPrivateUploadPath(fullPath)) return next();
    if (verifyUploadSignature(fullPath, req.query.exp, req.query.sig)) {
        // Fichier privé : jamais de cache partagé (proxy, CDN).
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return next();
    }
    return sendUploadError(req, res, 403,
        'Ce lien a expiré',
        'Pour protéger vos documents, les liens vers les fichiers ne restent valables qu’une heure environ. Rouvrez le document depuis HopeGestion pour obtenir un nouveau lien.',
        'Lien expiré ou invalide. Rouvrez le document depuis HopeGestion.');
}

/**
 * À monter APRÈS express.static('/uploads') : fichier absent du disque (ex. photos perdues
 * lors de la suspension du serveur). Sans lui, la demande tombait dans le 404 général de
 * l'API et le navigateur affichait du JSON brut (« Route not found »).
 */
export function uploadNotFound(req: Request, res: Response) {
    return sendUploadError(req, res, 404,
        'Fichier introuvable',
        'Ce fichier n’est plus disponible sur le serveur. Si vous en avez besoin, ajoutez-le de nouveau depuis HopeGestion.',
        'Fichier introuvable.');
}

/**
 * Réponse d'erreur lisible : page HTML pour un navigateur (fichier ouvert dans un onglet),
 * JSON pour un client d'API. Le code HTTP est le même dans les deux cas, ce qui garde le
 * repli « image cassée » du site (T-097), déclenché par le code d'erreur, pas par le contenu.
 * Les textes sont fixes : aucune donnée de la requête n'est insérée dans la page.
 */
function sendUploadError(req: Request, res: Response, status: number, title: string, text: string, jsonMessage: string) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.accepts(['json', 'html']) === 'html') {
        return res.status(status).type('html').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — HopeGestion</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f5f6f8;color:#1f2937}
main{max-width:28rem;margin:1rem;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}
h1{font-size:1.25rem;margin:0 0 .75rem}p{margin:0 0 1.25rem;line-height:1.5;color:#4b5563}
a{display:inline-block;padding:.6rem 1.2rem;border-radius:.6rem;background:#2563eb;color:#fff;text-decoration:none}</style></head>
<body><main><h1>${title}</h1><p>${text}</p><a href="/dashboard">Retour à HopeGestion</a></main></body></html>`);
    }
    return res.status(status).json({ message: jsonMessage });
}
