import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types pour les données de la quittance
export interface QuittanceData {
  id: string | number;
  numero: string;
  locataire: string;
  bien: string;
  periode: string;
  montant: number;
  datePaiement: string | Date;
  proprietaire?: string;
  charges?: number;
}

// Couleurs de la marque HopeGestion
const BRAND = {
  primary: [26, 54, 93] as [number, number, number],       // #1A365D - Navy
  accent: [220, 38, 74] as [number, number, number],        // #DC264A - Rose/Red
  blue: [59, 130, 246] as [number, number, number],          // #3B82F6 - Bright blue
  darkText: [30, 30, 30] as [number, number, number],        // Near-black
  mediumText: [90, 90, 90] as [number, number, number],      // Medium gray
  lightText: [140, 140, 140] as [number, number, number],    // Light gray
  tableBg: [245, 247, 250] as [number, number, number],      // Light bg
  white: [255, 255, 255] as [number, number, number],
};

// Cache for logo base64
let logoBase64Cache: string | null = null;

/**
 * Load logo image as base64 for embedding in PDF
 */
async function loadLogo(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Format currency in FCFA
 */
function formatCurrency(amount: number): string {
  // Replace narrow no-break space (U+202F) and no-break space (U+00A0) with regular space
  // jsPDF's Helvetica font can't render these, showing them as "/"
  return new Intl.NumberFormat('fr-FR').format(amount).replace(/[\u202F\u00A0]/g, ' ') + ' FCFA';
}

/**
 * Draw a horizontal line
 */
function drawLine(doc: jsPDF, y: number, x1: number = 20, x2?: number) {
  const w = x2 || doc.internal.pageSize.getWidth() - 20;
  doc.setDrawColor(...BRAND.lightText);
  doc.setLineWidth(0.3);
  doc.line(x1, y, w, y);
}

/**
 * Generate a professional rent receipt PDF
 * @param data Receipt data
 * @param mode 'download' saves the file, 'preview' opens in a new tab
 */
export const generateQuittancePDF = async (data: QuittanceData, mode: 'download' | 'preview' = 'download') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ─── LOAD LOGO ───
  const logo = await loadLogo();

  // ═══════════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ═══════════════════════════════════════════════════════════════════

  let headerY = 15;

  // Logo
  if (logo) {
    doc.addImage(logo, 'PNG', margin, headerY - 2, 40, 16);
  } else {
    // Fallback: text logo
    doc.setTextColor(...BRAND.primary);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HOPE GESTION', margin, headerY + 8);
  }

  // Date — top right
  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setTextColor(...BRAND.mediumText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cotonou, le ${formattedDate}`, pageWidth - margin, headerY + 4, { align: 'right' });

  // Contact info under date
  doc.setFontSize(8);
  doc.text('Tél: +229 01 02 03 04', pageWidth - margin, headerY + 10, { align: 'right' });
  doc.text('contact@hopegestion.com', pageWidth - margin, headerY + 15, { align: 'right' });

  // Separator
  headerY += 25;
  drawLine(doc, headerY);

  // ═══════════════════════════════════════════════════════════════════
  // TITLE SECTION
  // ═══════════════════════════════════════════════════════════════════

  headerY += 12;

  // Title with accent bar
  const titleWidth = 140;
  const titleX = (pageWidth - titleWidth) / 2;
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(titleX, headerY - 6, titleWidth, 22, 3, 3, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('QUITTANCE DE LOYER', pageWidth / 2, headerY + 4, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${data.numero}`, pageWidth / 2, headerY + 12, { align: 'center' });

  headerY += 28;

  // ═══════════════════════════════════════════════════════════════════
  // PARTIES SECTION (Bailleur & Locataire)
  // ═══════════════════════════════════════════════════════════════════

  const partiesY = headerY;
  const colWidth = contentWidth / 2 - 5;

  // --- Bailleur (Left column) ---
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, partiesY, colWidth, 42, 2, 2, 'F');

  doc.setTextColor(...BRAND.primary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BAILLEUR / GESTIONNAIRE', margin + 8, partiesY + 10);

  doc.setTextColor(...BRAND.darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.proprietaire || 'Agence Hope Immobilier', margin + 8, partiesY + 19);
  
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.mediumText);
  doc.text('Cotonou, Bénin', margin + 8, partiesY + 26);
  doc.text('Tél: +229 01 02 03 04', margin + 8, partiesY + 33);

  // --- Locataire (Right column) ---
  const rightColX = margin + colWidth + 10;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(rightColX, partiesY, colWidth, 42, 2, 2, 'F');

  doc.setTextColor(...BRAND.primary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LOCATAIRE', rightColX + 8, partiesY + 10);

  doc.setTextColor(...BRAND.darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.locataire, rightColX + 8, partiesY + 19);

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.mediumText);
  doc.text(`Bien: ${data.bien}`, rightColX + 8, partiesY + 26);

  headerY = partiesY + 52;

  // ═══════════════════════════════════════════════════════════════════
  // PAYMENT DETAILS TABLE
  // ═══════════════════════════════════════════════════════════════════

  const charges = data.charges || 0;
  const total = data.montant + charges;

  const tableData: any[][] = [
    ['Période concernée', data.periode],
    ['Loyer Principal', formatCurrency(data.montant)],
    ['Charges locatives', formatCurrency(charges)],
  ];

  autoTable(doc, {
    startY: headerY,
    head: [['Désignation', 'Montant / Détails']],
    body: tableData,
    foot: [['TOTAL PAYÉ', formatCurrency(total)]],
    theme: 'plain',
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 6,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
      textColor: BRAND.darkText,
    },
    footStyles: {
      fillColor: [235, 240, 248],
      textColor: BRAND.primary,
      fontSize: 11,
      fontStyle: 'bold',
      cellPadding: 7,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 253],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' as const },
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [220, 225, 230],
    },
    margin: { left: margin, right: margin },
  });

  const tableEndY = (doc as any).lastAutoTable.finalY || headerY + 80;

  // ═══════════════════════════════════════════════════════════════════
  // MODE DE PAIEMENT
  // ═══════════════════════════════════════════════════════════════════

  let infoY = tableEndY + 15;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, infoY - 5, contentWidth, 20, 2, 2, 'F');

  doc.setTextColor(...BRAND.mediumText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mode de paiement :', margin + 8, infoY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.darkText);
  doc.text('Mobile Money', margin + 60, infoY + 4);

  const paymentDate = new Date(data.datePaiement).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.mediumText);
  doc.text('Date de paiement :', pageWidth / 2 + 10, infoY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.darkText);
  doc.text(paymentDate, pageWidth / 2 + 60, infoY + 4);

  // ═══════════════════════════════════════════════════════════════════
  // LEGAL MENTION & SIGNATURE
  // ═══════════════════════════════════════════════════════════════════

  infoY += 35;

  // Legal notice
  doc.setTextColor(...BRAND.mediumText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Cette quittance annule tous les reçus qui auraient pu être donnés en acompte. Elle ne libère le locataire que pour la période indiquée ci-dessus.',
    margin, infoY, { maxWidth: contentWidth }
  );

  infoY += 20;
  drawLine(doc, infoY);
  infoY += 12;

  // Signature block
  doc.setTextColor(...BRAND.darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pour valoir ce que de droit.', margin, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Le Gestionnaire', pageWidth - margin, infoY, { align: 'right' });

  // Signature line
  infoY += 30;
  doc.setDrawColor(...BRAND.lightText);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 60, infoY, pageWidth - margin, infoY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.lightText);
  doc.text('(Signature & cachet)', pageWidth - margin - 30, infoY + 8, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════

  // Bottom accent bar
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Document généré automatiquement par la plateforme HopeGestion — www.hopegestion.com',
    pageWidth / 2, pageHeight - 10, { align: 'center' }
  );

  // ─── OUTPUT ───
  if (mode === 'preview') {
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  } else {
    doc.save(`Quittance_${data.numero}_${data.locataire.replace(/\s+/g, '_')}.pdf`);
  }
};
