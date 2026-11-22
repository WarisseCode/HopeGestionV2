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
    return res.status(403).json({ message: 'Lien expiré ou invalide. Rouvrez le document depuis HopeGestion.' });
}
