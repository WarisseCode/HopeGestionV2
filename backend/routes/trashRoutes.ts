// backend/routes/trashRoutes.ts
// Module Corbeille (CdC §XVII) : consultation des éléments supprimés (soft-delete),
// restauration et suppression définitive, avec RBAC + journalisation d'audit.
// ⚠️ Requêtes via req.dbClient (tenantGuard). Isolation owner/user via TrashService.

import { Router, Response } from 'express';
import { param } from 'express-validator';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import path from 'path';
import fs from 'fs-extra';
import { TrashService, getTrashModule, TrashContext, TrashImpact } from '../services/TrashService';
import { AuditService } from '../services/AuditService';
import { deleteFromSpaces } from '../services/spacesUploadService';

const router = Router();

// Construit le contexte d'accès. Admin = voit tout ; sinon limité aux owners gérés + à l'utilisateur.
function buildContext(req: AuthenticatedRequest): TrashContext {
    const isAdmin = (req as any).userRole === 'admin';
    const validOwnerIds: number[] = (req as any).validOwnerIds || [];
    return { isAdmin, ownerIds: validOwnerIds, userId: req.userId as number };
}

// RBAC écriture (restaurer / supprimer définitivement) : admin + gestionnaire uniquement.
// Agent / utilisateur standard : consultation seule (CdC §XVII.3).
function canWrite(req: AuthenticatedRequest): boolean {
    return ['admin', 'gestionnaire'].includes((req as any).userRole);
}

const itemRules = [
    param('module').isString().withMessage('Module invalide'),
    param('id').isInt({ min: 1 }).withMessage('Identifiant invalide'),
];

// Message lisible pour l'impact d'une purge : « 2 baux, 17 paiements ».
function describeImpact(impact: TrashImpact[]): string {
    return impact.map(i => `${i.count} ${i.label.toLowerCase()}`).join(', ');
}

// GET /api/trash — Liste des éléments en corbeille (filtres : module, search, deletedBy, dates)
router.get('/', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const ctx = buildContext(req);
        if (!ctx.isAdmin && ctx.ownerIds.length === 0 && !ctx.userId) return res.json([]);
        const { module, search, deletedBy, startDate, endDate } = req.query as Record<string, string>;
        const rows = await TrashService.list(dbClient, ctx, {
            module: module || undefined,
            search: search || undefined,
            deletedBy: deletedBy ? parseInt(deletedBy) : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
        res.json(rows);
    } catch (error) {
        console.error('Error listing trash:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/trash/export/excel — Export Excel de la corbeille (mêmes filtres que la liste)
router.get('/export/excel', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const ctx = buildContext(req);
        const { module, search, startDate, endDate } = req.query as Record<string, string>;
        const rows = await TrashService.list(dbClient, ctx, {
            module: module || undefined, search: search || undefined,
            startDate: startDate || undefined, endDate: endDate || undefined,
        });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Corbeille');
        ws.columns = [
            { header: 'Nom',          key: 'label',      width: 35 },
            { header: 'Type',         key: 'type',       width: 18 },
            { header: 'Module',       key: 'module',     width: 18 },
            { header: 'Supprimé par', key: 'deletedBy',  width: 22 },
            { header: 'Date',         key: 'date',       width: 22 },
        ];
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        rows.forEach((r: any) => ws.addRow({
            label: r.label, type: r.type_label, module: r.module_label,
            deletedBy: r.deleted_by_name,
            date: r.deleted_at ? new Date(r.deleted_at).toLocaleString('fr-FR') : '',
        }));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Corbeille_${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting trash:', error);
        res.status(500).json({ message: "Erreur lors de l'export" });
    }
});

// GET /api/trash/export/pdf — Export PDF de la corbeille (mêmes filtres que la liste)
router.get('/export/pdf', tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const ctx = buildContext(req);
        const { module, search, startDate, endDate } = req.query as Record<string, string>;
        const rows = await TrashService.list(dbClient, ctx, {
            module: module || undefined, search: search || undefined,
            startDate: startDate || undefined, endDate: endDate || undefined,
        });

        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Corbeille_${Date.now()}.pdf`);
        doc.pipe(res);

        const NAVY = '#1A365D';
        doc.fontSize(18).font('Helvetica-Bold').fillColor(NAVY).text('Corbeille — éléments supprimés', { align: 'left' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor('#666')
            .text(`Généré le ${new Date().toLocaleString('fr-FR')} · ${rows.length} élément(s)`);
        doc.moveDown(0.8);

        // Colonnes (largeurs en points). Page utile ~515pt à partir de x=40.
        const cols = [
            { key: 'label', label: 'Nom', w: 150 },
            { key: 'type_label', label: 'Type', w: 90 },
            { key: 'module_label', label: 'Module', w: 80 },
            { key: 'deleted_by_name', label: 'Supprimé par', w: 95 },
            { key: 'date', label: 'Date', w: 100 },
        ];
        const startX = 40;
        let y = doc.y;

        const drawHeader = () => {
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.rect(startX, y, 515, 18).fill(NAVY);
            let x = startX + 4;
            doc.fillColor('#FFFFFF');
            cols.forEach(c => { doc.text(c.label, x, y + 5, { width: c.w - 6 }); x += c.w; });
            y += 18;
        };
        drawHeader();

        doc.font('Helvetica').fontSize(8);
        rows.forEach((r: any, i: number) => {
            if (y > 780) { doc.addPage(); y = 40; drawHeader(); doc.font('Helvetica').fontSize(8); }
            if (i % 2 === 0) { doc.rect(startX, y, 515, 16).fill('#F5F7FA'); }
            let x = startX + 4;
            doc.fillColor('#1E1E1E');
            const vals: Record<string, string> = {
                label: r.label || '—', type_label: r.type_label, module_label: r.module_label,
                deleted_by_name: r.deleted_by_name,
                date: r.deleted_at ? new Date(r.deleted_at).toLocaleString('fr-FR') : '',
            };
            cols.forEach(c => { doc.text(String(vals[c.key] ?? ''), x, y + 4, { width: c.w - 6, ellipsis: true, lineBreak: false }); x += c.w; });
            y += 16;
        });

        doc.end();
    } catch (error) {
        console.error('Error exporting trash PDF:', error);
        if (!res.headersSent) res.status(500).json({ message: "Erreur lors de l'export PDF" });
    }
});

// POST /api/trash/:module/:id/restore — Restaurer un élément
router.post('/:module/:id/restore', tenantGuard, validate(itemRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    if (!canWrite(req)) return res.status(403).json({ message: 'Action non autorisée (consultation seule).' });
    const m = getTrashModule(req.params.module as string);
    if (!m) return res.status(404).json({ message: 'Module inconnu' });
    try {
        const ctx = buildContext(req);
        const done = await TrashService.restore(dbClient, m, parseInt(req.params.id as string), ctx);
        if (!done) return res.status(404).json({ message: 'Élément introuvable, déjà restauré, ou accès refusé' });
        AuditService.log({
            userId: String(req.userId), userName: (req as any).userName,
            action: 'restore', module: 'corbeille',
            entityType: m.module, entityId: String(req.params.id),
        });
        res.json({ message: 'Élément restauré' });
    } catch (error) {
        console.error('Error restoring item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/trash/:module/:id/impact — Ce qu'une suppression définitive détruirait.
// Alimente la modale de confirmation côté front (CdC §XVII : pas de perte silencieuse).
router.get('/:module/:id/impact', tenantGuard, validate(itemRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const m = getTrashModule(req.params.module as string);
    if (!m) return res.status(404).json({ message: 'Module inconnu' });
    try {
        const ctx = buildContext(req);
        const id = parseInt(req.params.id as string);
        // Contrôle d'accès avant tout comptage : ne pas divulguer le volume de
        // données d'un tenant voisin (anti-IDOR).
        if (!(await TrashService.canAccess(dbClient, m, id, ctx))) {
            return res.status(404).json({ message: 'Élément introuvable ou accès refusé' });
        }
        res.json({ impact: await TrashService.getImpact(dbClient, m, id) });
    } catch (error) {
        console.error('Error computing trash impact:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/trash/:module/:id[?force=true] — Suppression définitive (irréversible)
// Sans `force`, un élément ayant des données rattachées renvoie 409 + l'impact chiffré :
// le client doit confirmer explicitement avant que quoi que ce soit ne soit détruit.
router.delete('/:module/:id', tenantGuard, validate(itemRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    if (!canWrite(req)) return res.status(403).json({ message: 'Action non autorisée (consultation seule).' });
    const m = getTrashModule(req.params.module as string);
    if (!m) return res.status(404).json({ message: 'Module inconnu' });
    try {
        const ctx = buildContext(req);
        const id = parseInt(req.params.id as string);
        const force = String(req.query.force) === 'true';

        // Pour un document, on récupère l'URL AVANT la purge afin de nettoyer le fichier
        // physique (Spaces/disque) ensuite — la purge générique ne supprime que la ligne DB.
        let docUrl: string | null = null;
        if (m.module === 'documents') {
            const r = await dbClient.query('SELECT url FROM documents WHERE id = $1 AND deleted_at IS NOT NULL', [id]);
            docUrl = r.rows[0]?.url || null;
        }

        const result = await TrashService.purge(dbClient, m, id, ctx, force);

        if (result.status === 'not_found') {
            return res.status(404).json({ message: 'Élément introuvable ou accès refusé' });
        }
        if (result.status === 'blocked') {
            return res.status(409).json({
                requiresConfirmation: true,
                impact: result.impact,
                message: `Cette suppression détruira aussi : ${describeImpact(result.impact)}.`,
            });
        }

        // Nettoyage best-effort du fichier (non bloquant pour la réponse).
        if (docUrl) {
            if (docUrl.startsWith('http')) {
                deleteFromSpaces(docUrl).catch(err => console.warn('[TRASH] Spaces cleanup failed:', err));
            } else {
                fs.remove(path.join(__dirname, '../../', docUrl)).catch(() => {/* fichier déjà absent */});
            }
        }

        AuditService.log({
            userId: String(req.userId), userName: (req as any).userName,
            action: 'permanent_delete', module: 'corbeille',
            entityType: m.module, entityId: String(req.params.id),
            // On trace l'ampleur réelle : indispensable pour justifier a posteriori
            // la disparition d'un historique de paiements.
            details: { cascade: result.impact },
        });
        res.json({
            message: 'Élément supprimé définitivement',
            impact: result.impact,
        });
    } catch (error: any) {
        console.error('Error purging item:', error);
        // Filet de sécurité : une FK non déclarée dans TrashService (dérive de schéma)
        // reste bloquante. On renvoie la cause réelle plutôt qu'un 500 opaque.
        if (error?.code === '23503') {
            const referenced = String(error.detail || '').match(/table "([^"]+)"/)?.[1];
            return res.status(409).json({
                message: `Suppression impossible : des données${referenced ? ` de « ${referenced} »` : ''} référencent encore cet élément.`,
            });
        }
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
