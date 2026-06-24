// backend/routes/documentRoutes.ts
import { Router, Response } from 'express';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { body, param } from 'express-validator';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import PDFDocument from 'pdfkit';
import { upload } from '../middleware/uploadMiddleware';
import { validate } from '../middleware/validate';
import { uploadToSpaces } from '../services/spacesUploadService';

dotenv.config();

const router = Router();

// Champs texte multipart (le fichier lui-même est vérifié à la main via req.file).
const documentUploadRules = [
    body('entity_type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('entity_type invalide'),
    body('entity_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('entity_id invalide'),
    body('categorie').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Catégorie invalide'),
    body('nom').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Nom invalide'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Description trop longue'),
];
const documentGenerateRules = [
    body('templateId').notEmpty().withMessage('templateId est obligatoire').bail().isInt({ min: 1 }).withMessage('templateId invalide'),
    body('entityId').notEmpty().withMessage('entityId est obligatoire').bail().isInt({ min: 1 }).withMessage('entityId invalide'),
    body('type').notEmpty().withMessage('type est obligatoire').bail().isString().isLength({ max: 30 }).withMessage('type invalide'),
];
const documentIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];
const leaseGenerateParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant de bail invalide')];

const spacesConfigured = !!(
    process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_BUCKET
);

// --- Routes ---

// GET /api/documents - List documents (filtered by owner via RLS)
router.get('/', permissions.canRead('documents'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { entity_type, entity_id, categorie } = req.query;
        
        let query = `
            SELECT * FROM documents
            WHERE 1=1 AND deleted_at IS NULL
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (entity_type && entity_id) {
            query += ` AND entity_type = $${paramIndex} AND entity_id = $${paramIndex + 1}`;
            params.push(entity_type, entity_id);
            paramIndex += 2;
        }

        if (categorie) {
            query += ` AND categorie = $${paramIndex}`;
            params.push(categorie);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await dbClient.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/documents/upload - Upload file
router.post('/upload', permissions.canWrite('documents'), tenantGuard, upload.single('file'), validate(documentUploadRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const strictOwnerId = (req as any).resolvedOwnerId;

        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const { entity_type, entity_id, categorie, description, nom } = req.body;

        let url: string;
        if (spacesConfigured) {
            // Prod : upload vers Digital Ocean Spaces
            url = await uploadToSpaces(req.file, 'documents');
        } else {
            // Dev : fallback disque local
            const date = new Date();
            const folder = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const localDir = path.join(__dirname, '../../uploads', folder);
            await fs.ensureDir(localDir);
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
            await fs.writeFile(path.join(localDir, uniqueName), req.file.buffer);
            url = `/uploads/${folder}/${uniqueName}`;
        }

        const result = await dbClient.query(`
            INSERT INTO documents (
                user_id, nom, type, url, taille, categorie,
                entity_type, entity_id, description, owner_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            req.userId || 1,
            nom || req.file.originalname,
            req.file.mimetype,
            url,
            req.file.size.toString(),
            categorie || 'autre',
            entity_type,
            entity_id ? parseInt(entity_id) : null,
            description,
            strictOwnerId
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'upload ou accès refusé' });
    }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', permissions.canWrite('documents'), tenantGuard, validate(documentIdParam), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const { id } = req.params;

        // Soft-delete : déplacé vers la corbeille. On NE supprime PAS le fichier physique
        // (Spaces/disque) pour permettre la restauration ; le fichier ne sera nettoyé qu'à
        // la suppression définitive depuis la corbeille.
        const result = await dbClient.query(
            'UPDATE documents SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id',
            [id, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Document non trouvé ou accès refusé' });
        }

        res.json({ message: 'Document déplacé vers la corbeille' });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/documents/generate - Generate PDF from Template
router.post('/generate', permissions.canWrite('documents'), tenantGuard, validate(documentGenerateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const strictOwnerId = (req as any).resolvedOwnerId;
        const { templateId, entityId, type } = req.body; // type = 'lease', 'receipt'

        // 1. Fetch Template (document_templates table should be accessible/read-only usually without tenant logic or configured via RLS natively if any)
        const templateRes = await dbClient.query('SELECT * FROM document_templates WHERE id = $1', [templateId]);
        if (templateRes.rows.length === 0) return res.status(404).json({ message: 'Modèle introuvable' });
        const template = templateRes.rows[0];

        // 2. Fetch Data based on Type
        let data: any = {};
        if (type === 'lease') {
            const query = `
                SELECT 
                    l.id, l.date_debut, l.date_fin, l.loyer_actuel, l.signature_url,
                    t.nom as t_nom, t.prenoms as t_prenom, t.telephone_principal as t_tel,
                    b.adresse as b_adresse, b.type as b_type,
                    o.name as o_name, o.first_name as o_fname, o.phone as o_phone,
                    lo.ref_lot
                FROM leases l
                JOIN tenants t ON l.tenant_id = t.id
                JOIN lots lo ON l.lot_id = lo.id
                LEFT JOIN buildings b ON lo.building_id = b.id
                LEFT JOIN owners o ON l.owner_id = o.id
                WHERE l.id = $1
            `;
            const dbRes = await dbClient.query(query, [entityId]);
            if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Bail introuvable ou accès refusé' });
            const row = dbRes.rows[0];
            
            // Map to variables (French labels matching templateRoutes)
            data = {
                '{{Nom du Locataire}}': `${row.t_prenom} ${row.t_nom}`,
                '{{Téléphone Locataire}}': row.t_tel,
                '{{Nom du Propriétaire}}': row.o_name || `${row.o_fname} ${row.o_name}`,
                '{{Téléphone Propriétaire}}': row.o_phone,
                '{{Adresse du Bien}}': row.b_adresse,
                '{{Type de Bien}}': row.b_type,
                '{{Montant du Loyer}}': row.loyer_actuel,
                '{{Date de Début}}': new Date(row.date_debut).toLocaleDateString('fr-FR'),
                '{{Date de Fin}}': row.date_fin ? new Date(row.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée',
                '{{Référence Lot}}': row.ref_lot
            };
        } else {
            return res.status(400).json({ message: 'Type de document non supporté pour la génération automatique' });
        }

        // 3. Replace Variables
        let content = template.content;
        Object.keys(data).forEach(key => {
            content = content.replace(new RegExp(key, 'g'), data[key] || '');
        });

        // 4. Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        doc.on('end', async () => {
            const resultData = Buffer.concat(chunks);
            
            // Save logic
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

            let url: string;
            if (spacesConfigured) {
                const fakeFile = { buffer: resultData, originalname: fileName, mimetype: 'application/pdf' } as Express.Multer.File;
                url = await uploadToSpaces(fakeFile, 'documents');
            } else {
                const dir = path.join(__dirname, '../../uploads', `${year}/${month}`);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, fileName), resultData);
                url = `/uploads/${year}/${month}/${fileName}`;
            }
            
            const dbResult = await dbClient.query(`
                INSERT INTO documents (
                    user_id, nom, type, url, taille, categorie, 
                    entity_type, entity_id, description, owner_id
                ) VALUES ($1, $2, 'application/pdf', $3, $4, 'generated', $5, $6, 'Généré automatiquement', $7)
                RETURNING *
            `, [req.userId || 1, fileName, url, resultData.length.toString(), type, entityId, strictOwnerId]);

            res.status(201).json(dbResult.rows[0]);
        });

        // Write content
        doc.fontSize(12).text(content, {
            align: 'justify',
            lineGap: 4
        });

        doc.end();

    } catch (error) {
        console.error('Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erreur génération PDF' });
        }
    }
});

// POST /api/documents/generate/lease/:id - Generate lease PDF
router.post('/generate/lease/:id', permissions.canWrite('documents'), tenantGuard, validate(leaseGenerateParam), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const dbClient = (req as any).dbClient;
        const strictOwnerId = (req as any).resolvedOwnerId;
        const leaseId = req.params.id;

        // Check if document already exists for this lease
        const existingDoc = await dbClient.query(
            "SELECT id FROM documents WHERE entity_type = 'lease' AND entity_id = $1 AND categorie = 'baux'",
            [leaseId]
        );

        if (existingDoc.rows.length > 0) {
            return res.status(400).json({ 
                message: 'Un contrat de bail existe déjà pour cette location dans la liste des documents.' 
            });
        }

        // Fetch lease data with correct joins
        const leaseQuery = `
            SELECT 
                l.id, l.reference_bail, l.date_debut, l.date_fin, l.loyer_actuel, l.signature_url, l.date_signature_electronique, l.conditions_particulieres,
                t.nom as t_nom, t.prenoms as t_prenom, t.telephone_principal as t_tel, t.email as t_email,
                b.adresse as b_adresse, b.type as b_type,
                o.name as o_nom, o.first_name as o_prenom, o.phone as o_tel, o.company_name,
                lo.ref_lot, lo.etage
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lo ON l.lot_id = lo.id
            LEFT JOIN buildings b ON lo.building_id = b.id
            LEFT JOIN owners o ON l.owner_id = o.id
            WHERE l.id = $1
        `;
        const result = await dbClient.query(leaseQuery, [leaseId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        const data = result.rows[0];
        const tenantName = `${data.t_prenom} ${data.t_nom}`;
        const ownerName = data.company_name || `${data.o_prenom || ''} ${data.o_nom || ''}`.trim();
        
        // Generate PDF
        const doc = new PDFDocument({ margin: 50, bufferPages: true, size: 'A4' });
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('error', (err) => {
            console.error('PDFKit Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Erreur lors de la génération du PDF (PDFKit)' });
            }
        });
        doc.on('end', async () => {
            const resultData = Buffer.concat(chunks);
            
            // Save to disk or Spaces
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const fileName = `Bail_${leaseId}_${Date.now()}.pdf`;

            let url: string;
            if (spacesConfigured) {
                const fakeFile = { buffer: resultData, originalname: fileName, mimetype: 'application/pdf' } as Express.Multer.File;
                url = await uploadToSpaces(fakeFile, 'documents');
            } else {
                const dir = path.join(__dirname, '../../uploads', `${year}/${month}`);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, fileName), resultData);
                url = `/uploads/${year}/${month}/${fileName}`;
            }

            try {
                const dbResult = await dbClient.query(`
                    INSERT INTO documents (
                        user_id, nom, type, url, taille, categorie, 
                        entity_type, entity_id, description, owner_id
                    ) VALUES ($1, $2, 'application/pdf', $3, $4, 'baux', 'lease', $5, 'Contrat de bail généré automatiquement', $6)
                    RETURNING *
                `, [req.userId || 1, fileName, url, resultData.length.toString(), leaseId, strictOwnerId]);
                
                res.status(201).json(dbResult.rows[0]);
            } catch (err) {
                console.error('Error saving document to DB:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Erreur lors de la sauvegarde du document' });
                }
            }
        });

        // Write PDF content - NEW DESIGN
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Helper function for section titles
        const drawSectionTitle = (title: string, yPos: number): number => {
            if (yPos > pageHeight - 150) {
                doc.addPage();
                yPos = 50;
            }
            doc.roundedRect(50, yPos, pageWidth - 100, 25, 4).fillAndStroke('#F3F4F6', '#E5E7EB');
            doc.fillColor('#1F2937').fontSize(11).font('Helvetica-Bold').text(title, 60, yPos + 7);
            doc.fillColor('#4B5563'); 
            return yPos + 35; 
        };

        // Header Section
        doc.rect(0, 0, pageWidth, 100).fill('#1E3A8A'); 

        const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
            doc.roundedRect(25, 10, 200, 80, 10).fill('#FFFFFF');
            doc.image(logoPath, 35, 15, { height: 70 });
        } else {
            doc.roundedRect(25, 10, 200, 80, 10).fill('#FFFFFF');
            doc.fillColor('#1E3A8A').fontSize(22).font('Helvetica-Bold').text('HOPE GESTION', 45, 35);
        }

        // Right side
        doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold').text('CONTRAT DE BAIL', pageWidth - 250, 20, { align: 'right', width: 200 });
        doc.fillColor('#CBD5E1').fontSize(10).font('Helvetica').text(`Réf: ${data.reference_bail || 'Auto-généré'}`, pageWidth - 250, 42, { align: 'right', width: 200 });
        doc.fillColor('#CBD5E1').fontSize(10).text(`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 250, 58, { align: 'right', width: 200 });
        doc.fillColor('#93C5FD').fontSize(8).font('Helvetica-Oblique').text('Votre partenaire immobilier de confiance', pageWidth - 250, 76, { align: 'right', width: 200 });

        doc.fillColor('#1E3A8A');
        doc.y = 120;

        // Title
        doc.fontSize(16).font('Helvetica-Bold').text('CONTRAT DE BAIL À USAGE D\'HABITATION', 50, doc.y, { align: 'center', characterSpacing: 1 });
        doc.moveDown(2);

        // Content
        doc.fillColor('#4B5563');
        
        let currentY = drawSectionTitle('1. LES PARTIES AU CONTRAT', doc.y);
        doc.y = currentY;
        
        doc.font('Helvetica-Bold').fontSize(11).text('LE BAILLEUR (Propriétaire / Représentant) :');
        doc.font('Helvetica').fontSize(11).text(ownerName || 'Non renseigné');
        doc.text(`Représenté par : Cabinet HOPE GESTION`);
        doc.text(`Téléphone : ${data.o_tel || 'Non communiqué'}`);
        doc.moveDown(1);
        
        doc.font('Helvetica-Bold').fontSize(11).text('LE PRENEUR (Locataire Principal) :');
        doc.font('Helvetica').fontSize(11).text(tenantName);
        doc.text(`Téléphone : ${data.t_tel || 'Non communiqué'}`);
        doc.text(`Email : ${data.t_email || 'Non communiqué'}`);
        doc.moveDown(1);
        
        currentY = drawSectionTitle('2. DÉSIGNATION DES LIEUX LOUÉS', doc.y);
        doc.y = currentY;
        
        doc.font('Helvetica-Bold').text(`Désignation du Lot : `, { continued: true });
        doc.font('Helvetica').text(`${data.ref_lot} (Catégorie Usage : ${data.b_type || 'Résidentiel'})`);
        doc.font('Helvetica-Bold').text(`Adresse complète : `, { continued: true });
        doc.font('Helvetica').text(`${data.b_adresse || 'Non assignée'}`);
        doc.font('Helvetica-Bold').text(`Étage : `, { continued: true });
        doc.font('Helvetica').text(`${data.etage || 'Standard'}`);
        doc.moveDown(1);

        currentY = drawSectionTitle('3. DURÉE ET LLOYER DU BAIL', doc.y);
        doc.y = currentY;
        
        doc.font('Helvetica').text(`Le présent contrat de bail est conclu pour une durée commençant le `, { continued: true, align: 'justify' });
        doc.font('Helvetica-Bold').text(`${new Date(data.date_debut).toLocaleDateString('fr-FR')}`, { continued: true });
        if (data.date_fin) {
            doc.font('Helvetica').text(` et s'achevant contractuellement le `, { continued: true });
            doc.font('Helvetica-Bold').text(`${new Date(data.date_fin).toLocaleDateString('fr-FR')}`, { continued: true });
            doc.font('Helvetica').text(`.`);
        } else {
            doc.font('Helvetica').text(`, et est renouvelable par tacite reconduction.`);
        }
        
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Montant du Loyer mensuel prévu : ', { continued: true });
        doc.font('Helvetica').text(`${Number(data.loyer_actuel).toLocaleString('fr-FR')} FCFA / mois`);
        doc.moveDown(1);

        currentY = drawSectionTitle('4. CLAUSES ET CONDITIONS PARTICULIÈRES', doc.y);
        doc.y = currentY;
        
        doc.font('Helvetica-Oblique').text(data.conditions_particulieres || 'Le bail se déroule de plein droit sous les autres conditions d\'usage et de loi relatives aux baux d\'habitation de la législation en vigueur dans le pays. Aucune condition spécifique supplémentaire n\'a d\'autre part été expressément demandée par les deux parties contractantes.');
        doc.moveDown(2);
        
        doc.addPage();
        
        doc.rect(0, 0, pageWidth, 40).fill('#1E3A8A'); 
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text('HOPE GESTION', 50, 15);
        doc.fontSize(9).font('Helvetica').text(`Vérification des signatures - Réf: ${data.reference_bail || 'N/A'}`, pageWidth - 300, 16, { align: 'right', width: 250 });
        
        doc.fillColor('#1F2937');
        doc.y = 80;

        doc.fontSize(14).font('Helvetica-Bold').text('5. SIGNATURES DES PARTIES', 50, doc.y, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(10).font('Helvetica').text(`Fait en deux exemplaires originaux, réputés de bonne foi et destinés à valoir ce que de droit, à ___________________, le ${new Date().toLocaleDateString('fr-FR')}.`, { align: 'justify' });
        doc.moveDown(3);
        
        const sigY = doc.y;
        
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('POUR LE BAILLEUR', 50, sigY, { width: (pageWidth - 100) / 2, align: 'left' });
        doc.text('ET POUR LE PRENEUR (Locataire)', 50 + (pageWidth - 100) / 2, sigY, { width: (pageWidth - 100) / 2, align: 'right' });
        
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6B7280');
        doc.text('(Signature précédée de la mention "Lu et Approuvé")', 50, doc.y, { width: (pageWidth - 100) / 2, align: 'left' });
        
        if (!data.signature_url) {
            doc.text('(Signature précédée de la mention "Lu et Approuvé")', 50 + (pageWidth - 100) / 2, doc.y - 12, { width: (pageWidth - 100) / 2, align: 'right' });
        }

        if (data.signature_url) {
            try {
                const relativePath = data.signature_url.startsWith('/') ? data.signature_url.slice(1) : data.signature_url;
                let signaturePath = path.join(process.cwd(), '../', relativePath);
                if (!fs.existsSync(signaturePath)) signaturePath = path.join(process.cwd(), relativePath);

                if (fs.existsSync(signaturePath)) {
                    doc.image(signaturePath, 50 + (pageWidth - 100) / 2 + 50, sigY + 30, { width: 140 });
                    
                    if (data.date_signature_electronique) {
                        doc.fontSize(8).font('Helvetica-Bold')
                           .fillColor('#10B981') 
                           .text(`DOCUMENT SIGNÉ ÉLECTRONIQUEMENT\nDate : ${new Date(data.date_signature_electronique).toLocaleString('fr-FR')}\nCertifié par la plateforme HopeGestion\n(Intégrité numérique garantie)`, 50 + (pageWidth - 100) / 2, sigY + 110, { width: (pageWidth - 100) / 2, align: 'right' });
                    }
                }
            } catch (err) {
                console.error('Error embedding signature in PDF:', err);
            }
        }
        
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fillColor('#9CA3AF').fontSize(8).text(`— Page ${i + 1} sur ${pages.count} — \nPropulsé avec confiance et transparence par le système ERP HopeGestion`, 50, pageHeight - 50, { align: 'center' });
        }

        doc.end();

    } catch (error) {
        console.error('Error generating lease:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erreur lors de la génération du bail' });
        }
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — documentRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par l'avertissement réglementaire.
 * ✅ tenantGuard ajouté post-authMiddleware sur toutes les méthodes.
 * ✅ Suppression du helper 'getManagedOwnerIds' très verbeux. RLS fait le travail invisiblement dans le GET.
 * ✅ Remplacement de tous les pool.query par req.dbClient.query.
 * ✅ 'DELETE /' complété par vérifier rowCount = 0 (RLS refus).
 * ✅ Routes PDF modifiées pour incorporer la variable dbClient ET user_id, mais la création PDF ne subit pas d'interruption.
 * ✅ 'strictOwnerId' systématiquement injecté dans les requêtes de créations de documents en BDD via 'INSERT INTO documents'.
 * ═══════════════════════════════════════════════════
 */

export default router;
