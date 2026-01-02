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
}

export const generateQuittancePDF = (data: QuittanceData) => {
  // 1. Création du document (A4, portrait)
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();

  // --- EN-TÊTE ---
  // Couleur primaire de la marque (approximatif pour le PDF)
  doc.setTextColor(59, 130, 246); // Blue-500
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("HopeGestion", 20, 20);

  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Gestion Immobilière Simplifiée", 20, 26);
  
  // Date d'émission
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Cotonou, le ${today}`, width - 20, 20, { align: 'right' });

  // --- TITRE ---
  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("QUITTANCE DE LOYER", width / 2, 45, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${data.numero}`, width / 2, 52, { align: 'center' });

  // --- INFOS PARTIES ---
  const yStart = 70;
  
  // Bailleur / Gestionnaire
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("BAILLEUR / GESTIONNAIRE :", 20, yStart);
  doc.setFont('helvetica', 'normal');
  doc.text("Agence Hope Immobilier", 20, yStart + 7);
  doc.text("Cotonou, Bénin", 20, yStart + 14);
  doc.text("Tél: +229 01 02 03 04", 20, yStart + 21);

  // Locataire
  doc.setFont('helvetica', 'bold');
  doc.text("LOCATAIRE :", width / 2 + 10, yStart);
  doc.setFont('helvetica', 'normal');
  doc.text(data.locataire, width / 2 + 10, yStart + 7);
  doc.text(`Bien: ${data.bien}`, width / 2 + 10, yStart + 14);

  // --- TABLEAU DÉTAILS ---
  const tableData = [
    ['Période concernée', data.periode],
    ['Loyer Principal', `${data.montant.toLocaleString()} FCFA`],
    ['Charges', '0 FCFA'], // (À dynamiser plus tard si nécessaire)
    ['TOTAL PAYÉ', `${data.montant.toLocaleString()} FCFA`]
  ];

  autoTable(doc, {
    startY: yStart + 35,
    head: [['Désignation', 'Montant / Détails']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }, // Blue header
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' }
    },
    styles: { fontSize: 11, cellPadding: 5 }
  });

  // --- PIED DE PAGE / SIGNATURE ---
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.setFontSize(10);
  doc.text("Pour valoir ce que de droit.", 20, finalY + 20);
  
  doc.setFont('helvetica', 'bold');
  doc.text("Le Gestionnaire", width - 60, finalY + 20);
  
  // Mention légale (Design 'Wow' - petit cadre coloré en bas)
  doc.setFillColor(240, 249, 255); // Light blue bg
  doc.rect(0, doc.internal.pageSize.getHeight() - 20, width, 20, 'F');
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text("Ce document est généré automatiquement par la plateforme HopeGestion.", width / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

  // --- SAUVEGARDE ---
  doc.save(`Quittance_${data.numero}_${data.locataire.replace(/\s+/g, '_')}.pdf`);
};
