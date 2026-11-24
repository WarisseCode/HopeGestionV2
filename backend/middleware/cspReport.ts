// backend/middleware/cspReport.ts
//
// Réception des rapports de la politique de contenu (CSP) des pages du site (audit S8).
//
// La CSP des pages servies par nginx est d'abord posée en mode OBSERVATION
// (Content-Security-Policy-Report-Only) : le navigateur ne bloque rien, mais signale ici
// chaque ressource qui serait bloquée. Après quelques jours, la lecture de ces signalements
// dans les journaux PM2 (« [CSP] ») permet d'ajuster la politique avant de l'appliquer
// pour de bon, sans risquer de casser une fonction du site (docs/suivi/ENTETES_SECURITE_S8.md).

import express, { Request, Response, Router } from 'express';

// Une même infraction (directive + ressource) n'est journalisée qu'une fois par heure :
// chaque visiteur la déclencherait à chaque page, ce qui noierait les journaux.
const SEEN_TTL_MS = 60 * 60 * 1000;
const MAX_SEEN = 500;
const seen = new Map<string, number>();

/** Extrait les champs utiles des deux formats de rapport (report-uri et Reporting API). */
function normalize(body: unknown): Array<{ directive: string; blocked: string; page: string }> {
    const items = Array.isArray(body) ? body : [body];
    const out: Array<{ directive: string; blocked: string; page: string }> = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const r = (item as Record<string, any>)['csp-report'] ?? (item as Record<string, any>).body ?? item;
        if (!r || typeof r !== 'object') continue;
        const directive = String(r['effective-directive'] ?? r['violated-directive'] ?? r.effectiveDirective ?? '').slice(0, 80);
        const blocked = String(r['blocked-uri'] ?? r.blockedURL ?? '').slice(0, 200);
        const page = String(r['document-uri'] ?? r.documentURL ?? '').replace(/[?#].*$/, '').slice(0, 200);
        if (directive) out.push({ directive, blocked, page });
    }
    return out;
}

export function logCspReport(req: Request, res: Response) {
    const now = Date.now();
    for (const { directive, blocked, page } of normalize(req.body)) {
        const key = `${directive}|${blocked}`;
        const last = seen.get(key);
        if (last && now - last < SEEN_TTL_MS) continue;
        if (seen.size >= MAX_SEEN) seen.clear();
        seen.set(key, now);
        console.warn(`[CSP] directive=${directive} bloqué=${blocked || '(inline)'} page=${page}`);
    }
    // 204 : le navigateur n'attend aucun contenu.
    res.status(204).end();
}

/** Pour les tests : oublie les infractions déjà journalisées. */
export function resetCspReportMemory() {
    seen.clear();
}

/**
 * Route POST /api/csp-report. Les navigateurs envoient application/csp-report (ancien
 * format) ou application/reports+json (Reporting API) : le parseur JSON global ne lit que
 * application/json, d'où ce parseur dédié, limité à 10 Ko.
 */
export const cspReportRouter: Router = express.Router();
cspReportRouter.post(
    '/',
    express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '10kb' }),
    logCspReport,
);
