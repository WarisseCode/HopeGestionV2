// backend/routes/documentRoutes.ts
import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import PDFDocument from 'pdfkit';

dotenv.config();

const router = Router();

// Middleware to log all requests to this router
import pool from '../db/database';


// --- Multer Configuration ---
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const finalPath = path.join(uploadDir, `${year}/${month}`);
        
        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }
        cb(null, finalPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté (Images, PDF, Word uniquement)'));
        }
    }
});

// --- Routes ---

// GET /api/documents - List documents
router.get('/', permissions.canRead('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { entity_type, entity_id, categorie } = req.query;
        let query = `
            SELECT * FROM documents 
            WHERE 1=1
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

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/documents/upload - Upload file
router.post('/upload', permissions.canWrite('documents'), upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const { entity_type, entity_id, categorie, description, nom } = req.body;
        
        const relativePath = path.relative(path.join(__dirname, '../../'), req.file.path).replace(/\\/g, '/');
        const url = `/${relativePath}`;

        const result = await pool.query(`
            INSERT INTO documents (
                user_id, nom, type, url, taille, categorie, 
                entity_type, entity_id, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
            description
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload' });
    }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', permissions.canWrite('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT url FROM documents WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        const docUrl = result.rows[0].url;
        await pool.query('DELETE FROM documents WHERE id = $1', [id]);

        if (docUrl) {
            const filePath = path.join(__dirname, '../../', docUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Document supprimé' });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/documents/generate/lease/:id - Generate lease PDF
router.post('/generate/lease/:id', permissions.canWrite('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const leaseId = req.params.id;

        // Fetch lease data with correct joins
        const leaseQuery = `
            SELECT 
                l.id, l.date_debut, l.date_fin, l.loyer_actuel, l.signature_url, l.date_signature_electronique,
                t.nom as t_nom, t.prenoms as t_prenom, t.telephone_principal as t_tel,
                b.adresse as b_adresse, b.type as b_type,
                o.name as o_nom, o.first_name as o_prenom, o.phone as o_tel,
                lo.ref_lot, lo.etage
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lo ON l.lot_id = lo.id
            LEFT JOIN buildings b ON lo.building_id = b.id
            LEFT JOIN owners o ON l.owner_id = o.id
            WHERE l.id = $1
        `;
        const result = await pool.query(leaseQuery, [leaseId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé' });
        }

        const data = result.rows[0];
        const tenantName = `${data.t_prenom} ${data.t_nom}`;
        const ownerName = data.company_name || `${data.o_prenom || ''} ${data.o_nom || ''}`.trim();
        
        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
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
            
            // Save to disk
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const dir = path.join(uploadDir, `${year}/${month}`);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const fileName = `Bail_${leaseId}_${Date.now()}.pdf`;
            const filePath = path.join(dir, fileName);
            
            fs.writeFileSync(filePath, resultData);

            // Save to DB
            const relativePath = `uploads/${year}/${month}/${fileName}`;
            const url = `/${relativePath}`;

            try {
                const dbResult = await pool.query(`
                    INSERT INTO documents (
                        user_id, nom, type, url, taille, categorie, 
                        entity_type, entity_id, description
                    ) VALUES ($1, $2, 'application/pdf', $3, $4, 'baux', 'lease', $5, 'Contrat de bail généré automatiquement')
                    RETURNING *
                `, [req.userId || 1, fileName, url, resultData.length.toString(), leaseId]);
                
                res.status(201).json(dbResult.rows[0]);
            } catch (err) {
                console.error('Error saving document to DB:', err);
                res.status(500).json({ message: 'Erreur lors de la sauvegarde du document' });
            }
        });

        // Write PDF content
        doc.fontSize(18).font('Helvetica-Bold').text('CONTRAT DE BAIL À USAGE D\'HABITATION', { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(14).font('Helvetica-Bold').text('Entre les soussignés :');
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('LE BAILLEUR : ', { continued: true });
        doc.font('Helvetica').text(ownerName || 'Non renseigné');
        doc.text(`Représenté par l'agence HopeImmo`);
        doc.text(`Téléphone : ${data.o_tel || 'Non renseigné'}`);
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('ET', { align: 'center' });
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Bold').text('LE PRENEUR (Locataire) : ', { continued: true, align: 'left' });
        doc.font('Helvetica').text(tenantName);
        doc.text(`Téléphone : ${data.t_tel}`);
        doc.moveDown(1);
        
        doc.fontSize(14).font('Helvetica-Bold').text('IL A ÉTÉ CONVENU CE QUI SUIT :');
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('Article 1 : Objet du contrat');
        doc.fontSize(11).font('Helvetica').text(`Le Bailleur donne en location au Preneur les locaux situés à : ${data.b_adresse}.`);
        doc.text(`Type de bien : ${data.b_type || 'Appartement'}.`);
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('Article 2 : Durée');
        doc.fontSize(11).font('Helvetica').text(
            `Le présent bail est consenti pour une durée déterminée commençant le ${new Date(data.date_debut).toLocaleDateString('fr-FR')}.` +
            (data.date_fin ? ` Et se terminant le ${new Date(data.date_fin).toLocaleDateString('fr-FR')}.` : ' Renouvelable par tacite reconduction.')
        );
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('Article 3 : Loyer et Charges');
        doc.fontSize(11).font('Helvetica').text(`Le loyer mensuel est fixé à la somme de ${data.loyer_actuel} FCFA.`);
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica-Bold').text('Conditions Particulières');
        doc.fontSize(11).font('Helvetica-Oblique').text(data.conditions_particulieres || 'Aucune condition particulière.');
        doc.moveDown(1);
        
        // Add signature if exists
        if (data.signature_url) {
            try {
                console.log(`[DEBUG] CWD: ${process.cwd()}`);
                // URL: /uploads/signatures/... or uploads/signatures/...
                // If uploads is in project root (../uploads from backend), and we are in backend:
                // Try to find the file
                const relativePath = data.signature_url.startsWith('/') ? data.signature_url.slice(1) : data.signature_url;
                
                // Try root uploads first (HopeGestionV2/uploads)
                let signaturePath = path.join(process.cwd(), '../', relativePath);
                
                if (!fs.existsSync(signaturePath)) {
                    // Try backend uploads (HopeGestionV2/backend/uploads)
                    signaturePath = path.join(process.cwd(), relativePath);
                }

                console.log(`[DEBUG] Resolved signature path: ${signaturePath}`);
                console.log(`[DEBUG] File exists? ${fs.existsSync(signaturePath)}`);

                if (fs.existsSync(signaturePath)) {
                    console.log('[DEBUG] Embedding signature image...');
                    doc.moveDown(1);
                    doc.fontSize(11).font('Helvetica-Bold').text('LE PRENEUR (Signature Électronique) :', { underline: true });
                    doc.moveDown(0.5);
                    doc.image(signaturePath, { width: 150 });
                    console.log('[DEBUG] Signature image embedded.');
                    
                    if (data.date_signature_electronique) {
                        doc.fontSize(9).font('Helvetica-Oblique')
                           .fillColor('#666666')
                           .text(`Document signé électroniquement le : ${new Date(data.date_signature_electronique).toLocaleString('fr-FR')}`);
                        doc.text('Certifié par HopeGestion - Intégrité garantie.');
                        doc.fillColor('black'); // Reset
                    }
                    doc.moveDown(1);
                } else {
                    console.warn('[WARN] Signature file not found at path:', signaturePath);
                }
            } catch (err) {
                console.error('Error embedding signature in PDF:', err);
            }
        } else {
            console.log('[DEBUG] No signature_url found for this lease.');
        }

        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica').text(`Fait à Cotonou, le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
        doc.moveDown(2);
        
        console.log('[DEBUG] Finalizing PDF document...');
        const currentY = doc.y;
        const pageWidth = doc.page.width - 100;
        
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Le Bailleur', 50, currentY, { width: pageWidth / 2, align: 'center' });
        doc.text('Le Preneur', 50 + pageWidth / 2, currentY, { width: pageWidth / 2, align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Oblique');
        doc.text('(Signature précédée de la mention', 50, doc.y, { width: pageWidth / 2, align: 'center' });
        doc.text('"Lu et Approuvé")', 50, doc.y, { width: pageWidth / 2, align: 'center' });
        
        if (!data.signature_url) {
            doc.text('(Signature précédée de la mention', 50 + pageWidth / 2, currentY + 15, { width: pageWidth / 2, align: 'center' });
            doc.text('"Lu et Approuvé")', 50 + pageWidth / 2, doc.y, { width: pageWidth / 2, align: 'center' });
        } else {
            doc.fillColor('#008000').text('Document Signé Électroniquement', 50 + pageWidth / 2, currentY + 15, { width: pageWidth / 2, align: 'center' });
            doc.fillColor('black');
        }
        
        doc.end();

    } catch (error) {
        console.error('Error generating lease:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du bail' });
    }
});

export default router;
