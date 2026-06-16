// backend/services/EdlPdfService.ts
// Génération serveur des PDF du module États des lieux (CdC VIII.5 / VIII.7 / VIII.10) :
//  - streamEdlPdf      : document EDL officiel (constats par pièce, photos, signatures)
//  - streamComparePdf  : rapport comparatif entrée/sortie (synthèse + points de retenue)
//
// Le PDF est généré à la volée et streamé dans la réponse HTTP (pas de stockage :
// évite l'écueil du disque éphémère en prod). Les images sont chargées au mieux —
// disque local pour les URLs /uploads/..., fetch pour une URL externe, base64 sinon.

import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import { Response } from 'express';

const PAGE_BOTTOM = 800; // limite basse avant saut de page (A4 = 841.89, marge 50)
const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const NAVY = '#1A365D';
const DARK = '#1E1E1E';
const MED = '#5A5A5A';
const LIGHT = '#8C8C8C';
const LIGHT_BG = '#F5F7FA';

const ETAT_COLOR: Record<string, string> = {
    neuf: '#15803d', bon: '#0f766e', usager: '#a16207', moyen: '#a16207', mauvais: '#c2410c', hs: '#b91c1c',
};
const STATUT_LABEL: Record<string, string> = {
    degradation: 'Dégradation', amelioration: 'Amélioration', inchange: 'Inchangé', manquant: 'Manquant', ajoute: 'Ajouté',
};
const STATUT_COLOR: Record<string, string> = {
    degradation: '#b91c1c', manquant: '#c2410c', ajoute: '#1d4ed8', amelioration: '#15803d', inchange: '#5A5A5A',
};

const TYPE_LABEL: Record<string, string> = {
    entree: "État des lieux d'Entrée", sortie: 'État des lieux de Sortie', intermediaire: 'Contrôle Intermédiaire',
};

// Charge une image en Buffer, au mieux : base64 → disque (/uploads/...) → HTTP.
async function loadImageBuffer(src?: string): Promise<Buffer | null> {
    if (!src) return null;
    try {
        if (src.startsWith('data:')) {
            const b64 = src.split(',')[1];
            return b64 ? Buffer.from(b64, 'base64') : null;
        }
        const idx = src.indexOf('/uploads/');
        if (idx !== -1) {
            const rel = src.slice(idx + '/uploads/'.length);
            const p = path.join(__dirname, '../../uploads', rel);
            return (await fs.pathExists(p)) ? await fs.readFile(p) : null;
        }
        if (/^https?:\/\//.test(src)) {
            const fetchFn = (globalThis as any).fetch;
            if (!fetchFn) return null;
            const resp = await fetchFn(src);
            if (!resp.ok) return null;
            return Buffer.from(await resp.arrayBuffer());
        }
    } catch {
        /* image illisible → on l'ignore, le PDF reste généré */
    }
    return null;
}

function formatDate(d?: string | Date): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d));
}

// En-tête commun (logo texte + coordonnées + titre).
function header(doc: PDFKit.PDFDocument, title: string, subtitle: string): number {
    let y = 40;
    doc.fontSize(18).font('Helvetica-Bold').fillColor(NAVY).text('HOPE GESTION', MARGIN, y);
    doc.fontSize(8).font('Helvetica').fillColor(MED).text('Gestion Immobilière Simplifiée', MARGIN, y + 20);
    doc.fontSize(9).font('Helvetica').fillColor(MED)
        .text(`Cotonou, le ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN - 160, y, { width: 160, align: 'right' })
        .text('contact@hopegestion.com', PAGE_WIDTH - MARGIN - 160, y + 14, { width: 160, align: 'right' });

    y += 44;
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor('#DDE1E6').stroke();

    y += 14;
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 38, 4).fill(NAVY);
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text(title, MARGIN, y + 7, { width: CONTENT_WIDTH, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF').text(subtitle, MARGIN, y + 24, { width: CONTENT_WIDTH, align: 'center' });
    return y + 54;
}

function footer(doc: PDFKit.PDFDocument): void {
    const fy = doc.page.height - 32;
    doc.rect(0, fy, PAGE_WIDTH, 32).fill(NAVY);
    doc.fontSize(7).font('Helvetica').fillColor('#FFFFFF')
        .text('Document généré par la plateforme HopeGestion — www.hopegestion.com', 0, fy + 12, { align: 'center', width: PAGE_WIDTH });
}

// ─── PDF d'un EDL ────────────────────────────────────────────────────────────
export async function streamEdlPdf(res: Response, edl: any, items: any[]): Promise<void> {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${edl.ref_edl || 'EDL'}.pdf"`);
    doc.pipe(res);

    let y = header(doc, (TYPE_LABEL[edl.type_edl] || 'État des lieux').toUpperCase(), `${edl.ref_edl}  ·  ${formatDate(edl.date_realisation)}  ·  ${edl.statut}`);

    const ensure = (h: number) => { if (y + h > PAGE_BOTTOM) { doc.addPage(); y = 50; } };

    // Bloc infos (bien / parties)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 56, 3).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text('BIEN', MARGIN + 12, y + 10);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(edl.ref_lot || '—', MARGIN + 12, y + 22);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text('PARTIES', PAGE_WIDTH / 2, y + 10);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(`Agent : ${edl.agent_name || '—'}`, PAGE_WIDTH / 2, y + 22);
    doc.text(`Locataire : ${edl.locataire_name || '—'}`, PAGE_WIDTH / 2, y + 36);
    y += 70;

    // Constats par pièce
    const groups: Record<string, any[]> = {};
    for (const it of items) (groups[it.piece] = groups[it.piece] || []).push(it);

    for (const [piece, list] of Object.entries(groups)) {
        ensure(28);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(NAVY).text(piece, MARGIN, y);
        y += 20;
        doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.3).strokeColor('#DDE1E6').stroke();
        y += 8;

        for (const it of list) {
            ensure(40);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(it.nom, MARGIN + 4, y, { width: CONTENT_WIDTH - 120, continued: false });
            doc.fontSize(9).font('Helvetica-Bold').fillColor(ETAT_COLOR[(it.etat || '').toLowerCase()] || MED)
                .text((it.etat || '').toUpperCase(), PAGE_WIDTH - MARGIN - 110, y, { width: 110, align: 'right' });
            y += 14;
            if (it.observation) {
                ensure(14);
                doc.fontSize(8).font('Helvetica-Oblique').fillColor(MED).text(it.observation, MARGIN + 8, y, { width: CONTENT_WIDTH - 16 });
                y += 14;
            }
            // Photos (max 4, best-effort)
            const photos: string[] = Array.isArray(it.photos) ? it.photos : [];
            if (photos.length) {
                ensure(70);
                let x = MARGIN + 8;
                for (const src of photos.slice(0, 4)) {
                    const buf = await loadImageBuffer(src);
                    if (buf) {
                        try { doc.image(buf, x, y, { fit: [60, 60] }); } catch { /* image invalide */ }
                        x += 68;
                    }
                }
                y += 68;
            }
            y += 4;
        }
        y += 6;
    }

    // Signatures
    ensure(110);
    y += 6;
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor('#DDE1E6').stroke();
    y += 14;
    const sig = edl.signatures_json || {};
    const colW = (CONTENT_WIDTH - 20) / 2;
    const boxes: [string, any][] = [['Signature Agent / Gestionnaire', sig.agent], ['Signature Locataire', sig.locataire]];
    for (let i = 0; i < boxes.length; i++) {
        const [label, data] = boxes[i]!;
        const bx = MARGIN + i * (colW + 20);
        doc.roundedRect(bx, y, colW, 80, 3).lineWidth(0.5).strokeColor('#CCC').stroke();
        doc.fontSize(8).font('Helvetica-Bold').fillColor(MED).text(label, bx + 8, y + 8);
        const buf = await loadImageBuffer(data?.signature_url);
        if (buf) { try { doc.image(buf, bx + 8, y + 22, { fit: [colW - 16, 48] }); } catch { /* ignore */ } }
    }

    footer(doc);
    doc.end();
}

// ─── PDF du rapport comparatif entrée/sortie ─────────────────────────────────
export async function streamComparePdf(res: Response, data: any): Promise<void> {
    const { entree, sortie, comparison, summary } = data;
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comparatif-${entree?.ref_edl || ''}-${sortie?.ref_edl || ''}.pdf"`);
    doc.pipe(res);

    let y = header(doc, 'RAPPORT COMPARATIF ENTRÉE / SORTIE', `${entree?.ref_lot || sortie?.ref_lot || ''}`);
    const ensure = (h: number) => { if (y + h > PAGE_BOTTOM) { doc.addPage(); y = 50; } };

    // En-têtes des deux EDL
    const colW = (CONTENT_WIDTH - 20) / 2;
    doc.roundedRect(MARGIN, y, colW, 44, 3).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text('ENTRÉE', MARGIN + 10, y + 8);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(`${entree?.ref_edl || '—'}`, MARGIN + 10, y + 20);
    doc.fontSize(8).fillColor(MED).text(formatDate(entree?.date_realisation), MARGIN + 10, y + 32);
    doc.roundedRect(MARGIN + colW + 20, y, colW, 44, 3).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text('SORTIE', MARGIN + colW + 30, y + 8);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(`${sortie?.ref_edl || '—'}`, MARGIN + colW + 30, y + 20);
    doc.fontSize(8).fillColor(MED).text(formatDate(sortie?.date_realisation), MARGIN + colW + 30, y + 32);
    y += 58;

    // Synthèse
    const cells: [string, number, string][] = [
        ['Dégradations', summary.degradations, STATUT_COLOR.degradation || DARK],
        ['Manquants', summary.manquants, STATUT_COLOR.manquant || DARK],
        ['Ajoutés', summary.ajoutes, STATUT_COLOR.ajoute || DARK],
        ['Améliorations', summary.ameliorations, STATUT_COLOR.amelioration || DARK],
        ['Inchangés', summary.inchanges, MED],
    ];
    const cw = (CONTENT_WIDTH - 4 * 8) / 5;
    cells.forEach((c, i) => {
        const cx = MARGIN + i * (cw + 8);
        doc.roundedRect(cx, y, cw, 44, 3).lineWidth(0.5).strokeColor('#DDE1E6').stroke();
        doc.fontSize(16).font('Helvetica-Bold').fillColor(c[2]).text(String(c[1]), cx, y + 8, { width: cw, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor(MED).text(c[0], cx, y + 30, { width: cw, align: 'center' });
    });
    y += 60;

    // Points de retenue
    const retenue = (comparison || []).filter((c: any) => c.statut === 'degradation' || c.statut === 'manquant');
    if (retenue.length) {
        ensure(30);
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 3).fill('#FEF2F2');
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(`Points de retenue potentiels (${retenue.length})`, MARGIN + 10, y + 6);
        y += 30;
        for (const c of retenue) {
            ensure(16);
            const txt = c.statut === 'manquant' ? 'élément manquant à la sortie' : `${c.etat_entree} → ${c.etat_sortie}`;
            doc.fontSize(9).font('Helvetica').fillColor(DARK).text(`• ${c.piece} — ${c.nom} : ${txt}`, MARGIN + 8, y, { width: CONTENT_WIDTH - 16 });
            y += 14;
        }
        y += 8;
    }

    // Détail complet
    ensure(24);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text('Détail des éléments', MARGIN, y);
    y += 18;
    for (const c of comparison || []) {
        ensure(18);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
            .text(`${c.piece} — ${c.nom}`, MARGIN + 4, y, { width: CONTENT_WIDTH - 200, continued: false });
        doc.fontSize(8).font('Helvetica').fillColor(MED)
            .text(`${c.etat_entree || '—'} → ${c.etat_sortie || '—'}`, PAGE_WIDTH - MARGIN - 195, y, { width: 110, align: 'right' });
        doc.fontSize(8).font('Helvetica-Bold').fillColor(STATUT_COLOR[c.statut] || MED)
            .text(STATUT_LABEL[c.statut] || c.statut, PAGE_WIDTH - MARGIN - 80, y, { width: 80, align: 'right' });
        y += 14;
    }

    footer(doc);
    doc.end();
}

export default { streamEdlPdf, streamComparePdf };
