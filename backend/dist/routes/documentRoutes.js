"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Configuration Multer pour le stockage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nom de fichier unique : timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite 5MB
    fileFilter: (req, file, cb) => {
        // Accepter images et PDF
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Seuls les images et les PDF sont autorisés.'));
        }
    }
});
// Récupérer tous les documents de l'utilisateur connecté
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await database_1.default.query(`SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        res.json({ documents: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des documents' });
    }
});
// Upload d'un fichier
router.post('/upload', authMiddleware_1.protect, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { categorie, description, entity_type, entity_id } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Aucun fichier fourni.' });
        }
        // Enregistrement en base
        const result = await database_1.default.query(`INSERT INTO documents 
       (user_id, nom, type, url, taille, categorie, description, entity_type, entity_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`, [
            userId,
            file.originalname,
            file.mimetype,
            file.filename, // On stocke le nom du fichier sur le disque
            file.size,
            categorie || 'Autre',
            description,
            entity_type,
            entity_id
        ]);
        // Log Audit
        const { AuditService } = require('../services/AuditService'); // Import dynamique pour éviter cycles
        AuditService.log({
            userId: userId,
            action: 'UPLOAD_DOCUMENT',
            entityType: 'DOCUMENT',
            entityId: result.rows[0].id,
            details: { filename: file.originalname, size: file.size },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
        });
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de l\'upload du document' });
    }
});
// Télécharger / Visualiser un document
router.get('/download/:id', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const docId = req.params.id;
        // 1. Récupérer les infos du document
        const result = await database_1.default.query('SELECT * FROM documents WHERE id = $1', [docId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }
        const doc = result.rows[0];
        // 2. Vérification des permissions
        // L'utilisateur doit être le propriétaire OU un gestionnaire/admin
        // Pour l'instant on check juste l'owner_id (user_id)
        if (doc.user_id !== userId && req.user.role !== 'admin' && req.user.userType !== 'gestionnaire') {
            return res.status(403).json({ message: 'Accès refusé' });
        }
        // 3. Servir le fichier
        const filePath = path_1.default.join(__dirname, '../../uploads', doc.url);
        if (fs_1.default.existsSync(filePath)) {
            res.download(filePath, doc.nom);
        }
        else {
            res.status(404).json({ message: 'Fichier physique introuvable.' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Supprimer un document
router.delete('/:id', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const docId = req.params.id;
        // Vérifier que le document appartient à l'utilisateur
        const check = await database_1.default.query('SELECT * FROM documents WHERE id = $1', [docId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }
        const doc = check.rows[0];
        if (doc.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès interdit' });
        }
        // Supprimer le fichier physique
        const filePath = path_1.default.join(__dirname, '../../uploads', doc.url);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Supprimer en BDD
        await database_1.default.query('DELETE FROM documents WHERE id = $1', [docId]);
        // Audit
        const { AuditService } = require('../services/AuditService');
        AuditService.log({
            userId: userId,
            action: 'DELETE_DOCUMENT',
            entityType: 'DOCUMENT',
            entityId: docId,
            details: { filename: doc.nom },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
        });
        res.json({ message: 'Document supprimé' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
});
exports.default = router;
//# sourceMappingURL=documentRoutes.js.map