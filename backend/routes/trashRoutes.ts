// backend/routes/trashRoutes.ts
// Module Corbeille (CdC §XVII) : consultation des éléments supprimés (soft-delete),
// restauration et suppression définitive, avec RBAC + journalisation d'audit.
// ⚠️ Requêtes via req.dbClient (tenantGuard). Isolation owner/user via TrashService.

import { Router, Response } from 'express';
import { param } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import { TrashService, getTrashModule, TrashContext } from '../services/TrashService';
import { AuditService } from '../services/AuditService';

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

// DELETE /api/trash/:module/:id — Suppression définitive (irréversible)
router.delete('/:module/:id', tenantGuard, validate(itemRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    if (!canWrite(req)) return res.status(403).json({ message: 'Action non autorisée (consultation seule).' });
    const m = getTrashModule(req.params.module as string);
    if (!m) return res.status(404).json({ message: 'Module inconnu' });
    try {
        const ctx = buildContext(req);
        const done = await TrashService.purge(dbClient, m, parseInt(req.params.id as string), ctx);
        if (!done) return res.status(404).json({ message: 'Élément introuvable ou accès refusé' });
        AuditService.log({
            userId: String(req.userId), userName: (req as any).userName,
            action: 'permanent_delete', module: 'corbeille',
            entityType: m.module, entityId: String(req.params.id),
        });
        res.json({ message: 'Élément supprimé définitivement' });
    } catch (error) {
        console.error('Error purging item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
