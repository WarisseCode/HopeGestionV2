// backend/middleware/uploadMiddleware.ts
//
// Utilise multer en mémoire (memoryStorage) pour permettre l'upload vers
// Digital Ocean Spaces / S3 sans écriture temporaire sur le disque local.
// Le disque local est éphémère sur Render — aucun fichier ne doit y persister.

import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { fromBuffer } from 'file-type';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];
const ALLOWED_TYPES       = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

// Map MIME → extensions réelles attendues (magic bytes)
const ALLOWED_MIME_SET = new Set(ALLOWED_TYPES);

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'));
        cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF. Les fichiers Word (.doc, .docx) ne sont pas acceptés.'));
    }
};

export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 10,
    },
});

// Middleware d'erreur ciblé, à placer juste après upload.single(...)/upload.array(...)
// sur une route précise. Toute erreur qui arrive ici vient forcément de multer (limite
// de taille/nombre de fichiers, ou format refusé par fileFilter) : sans err.status, elle
// tombait dans le gestionnaire d'erreurs générique de index.ts et ressortait en 500 —
// masquant un refus de saisie utilisateur derrière une "erreur serveur". On répond 400
// directement ici, sans toucher au gestionnaire d'erreurs global (inchangé pour le reste
// de l'API).
export function handleUploadErrors(err: unknown, _req: Request, res: Response, next: NextFunction) {
    if (!err) return next();
    res.status(400).json({
        message: 'Justificatif refusé : format non accepté ou fichier trop volumineux (10 Mo maximum).',
    });
}

// Middleware post-multer : vérifie les magic bytes réels du fichier.
// Le Content-Type déclaré par le client peut être falsifié — les magic bytes ne mentent pas.
export async function verifyMagicBytes(req: Request, res: Response, next: NextFunction) {
    const files = req.file ? [req.file] : (req.files as Express.Multer.File[] | undefined) || [];

    for (const file of files) {
        if (!file.buffer || file.buffer.length === 0) continue;

        const detected = await fromBuffer(file.buffer);

        if (!detected || !ALLOWED_MIME_SET.has(detected.mime)) {
            return res.status(400).json({
                error: 'Fichier invalide',
                message: `Le contenu du fichier "${file.originalname}" ne correspond pas à un format autorisé.`,
            });
        }
    }

    next();
}
