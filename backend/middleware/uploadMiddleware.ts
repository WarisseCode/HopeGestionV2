// backend/middleware/uploadMiddleware.ts

import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';

// Generate unique filename (without uuid to avoid ESM issues)
const generateFilename = (file: Express.Multer.File): string => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const ext = path.extname(file.originalname);
    return `${uniqueSuffix}${ext}`;
};

// Configuration du stockage sur disque local
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/others';

        // Déterminer le sous-dossier selon le fieldname ou le type
        if (req.body.type === 'property' || file.fieldname === 'propertyImages') {
            uploadPath = 'uploads/properties';
        } else if (req.body.type === 'avatar' || file.fieldname === 'avatar') {
            uploadPath = 'uploads/avatars';
        } else if (req.body.type === 'document') {
            uploadPath = 'uploads/documents';
        } else if (req.body.type === 'inventory') {
            uploadPath = 'uploads/inventories';
        } else if (req.body.type === 'expense' || file.fieldname === 'proof') {
            uploadPath = 'uploads/expenses';
        }

        // Créer le dossier s'il n'existe pas
        fs.ensureDirSync(path.join(__dirname, '../../', uploadPath));
        cb(null, path.join(__dirname, '../../', uploadPath));
    },
    filename: (req, file, cb) => {
        cb(null, generateFilename(file));
    }
});

// Filtre de fichiers
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    const allowedDocTypes = ['application/pdf'];

    if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (file.fieldname === 'document' && allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'), false);
    }
};

// Configuration Multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
        files: 10 // Max 10 fichiers par upload multiple
    }
});
