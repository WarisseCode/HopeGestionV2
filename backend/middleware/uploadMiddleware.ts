// backend/middleware/uploadMiddleware.ts
//
// Utilise multer en mémoire (memoryStorage) pour permettre l'upload vers
// Digital Ocean Spaces / S3 sans écriture temporaire sur le disque local.
// Le disque local est éphémère sur Render — aucun fichier ne doit y persister.

import multer from 'multer';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];
const ALLOWED_TYPES       = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'));
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
