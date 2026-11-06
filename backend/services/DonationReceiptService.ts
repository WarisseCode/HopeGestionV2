// backend/services/DonationReceiptService.ts
// Service for generating PDF donation receipts (reçus de don)
// Même moule que ReceiptService.ts (quittances de loyer) — service dédié,
// pas de modification du service existant (les deux documents sont légalement
// distincts et n'ont pas vocation à partager du code au-delà de la charte graphique).

import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import pool from '../db/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RECEIPTS_DIR = path.join(__dirname, '../../uploads/donation-receipts');

// Ensure receipts directory exists
fs.ensureDirSync(RECEIPTS_DIR);

// [PLACEHOLDER] Identité légale de HopeGestion pour les reçus de don —
// à confirmer avec le client (adresse exacte, numéro RCCM/IFU s'il y a lieu
// de mentionner une déductibilité fiscale). Ne pas utiliser tel quel en
// production sans validation.
const ORGANIZATION_IDENTITY = {
    name: 'HOPE GESTION',
    address: '[Adresse légale à confirmer], Cotonou, Bénin',
    taxId: '[Numéro IFU/RCCM à confirmer]',
    phone: '+229 01 02 03 04',
    email: 'contact@hopegestion.com',
};

// ============================================================================
// TYPES
// ============================================================================

export interface DonationReceiptData {
    donationId: number;
    receiptNumber: string;
    date: Date;
    donor: {
        name: string;
        email: string | null;
        phone: string | null;
    };
    amount: number;
    currency: string;
    description: string | null;
    transactionReference: string | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class DonationReceiptService {

    /**
     * Generate a PDF receipt for an approved donation
     */
    async generateReceipt(donationId: number): Promise<string> {
        try {
            const receiptData = await this.getReceiptData(donationId);

            const filename = `don_${receiptData.receiptNumber}_${crypto.randomBytes(16).toString('hex')}.pdf`;
            const filepath = path.join(RECEIPTS_DIR, filename);

            await this.createPDF(receiptData, filepath);

            const relativeUrl = `/uploads/donation-receipts/${filename}`;
            await pool.query(
                'UPDATE donations SET receipt_url = $1 WHERE id = $2',
                [relativeUrl, donationId]
            );

            console.log(`[DonationReceiptService] Generated receipt: ${filename}`);
            return relativeUrl;

        } catch (error) {
            console.error('[DonationReceiptService] Error generating receipt:', error);
            throw error;
        }
    }

    /**
     * Fetch all data needed for the receipt
     */
    private async getReceiptData(donationId: number): Promise<DonationReceiptData> {
        const result = await pool.query(
            `SELECT id, donor_name, donor_email, donor_phone, amount, currency,
                    description, fedapay_transaction_id, paid_at, created_at
             FROM donations
             WHERE id = $1`,
            [donationId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Donation ${donationId} not found`);
        }

        const row = result.rows[0];
        const date = row.paid_at ? new Date(row.paid_at) : new Date(row.created_at);

        // Format: YYYYMM-DONATION_ID
        const receiptNumber = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${donationId}`;

        return {
            donationId,
            receiptNumber,
            date,
            donor: {
                name: row.donor_name,
                email: row.donor_email || null,
                phone: row.donor_phone || null,
            },
            amount: parseFloat(row.amount),
            currency: row.currency || 'XOF',
            description: row.description || null,
            transactionReference: row.fedapay_transaction_id || null,
        };
    }

    /**
     * Create the PDF document — même charte graphique que ReceiptService
     * (bleu marine, bandeau titre, tableau, mention légale, footer).
     */
    private async createPDF(data: DonationReceiptData, filepath: string): Promise<void> {
        const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const stream = fs.createWriteStream(filepath);
                doc.pipe(stream);

                const pageWidth = 595.28; // A4 width in points
                const margin = 50;
                const contentWidth = pageWidth - margin * 2;

                const navy = '#1A365D';
                const darkText = '#1E1E1E';
                const mediumText = '#5A5A5A';
                const lightText = '#8C8C8C';
                const lightBg = '#F5F7FA';

                // ─── HEADER ───
                let y = 40;

                if (fs.existsSync(LOGO_PATH)) {
                    doc.image(LOGO_PATH, margin, y - 5, { width: 120 });
                } else {
                    doc.fontSize(18).font('Helvetica-Bold').fillColor(navy)
                        .text(ORGANIZATION_IDENTITY.name, margin, y);
                    doc.fontSize(8).font('Helvetica').fillColor(mediumText)
                        .text('Gestion Immobilière Simplifiée', margin, y + 18);
                }

                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(`Cotonou, le ${this.formatDate(new Date())}`, pageWidth - margin - 150, y, { width: 150, align: 'right' })
                    .text(`Tél: ${ORGANIZATION_IDENTITY.phone}`, pageWidth - margin - 150, y + 14, { width: 150, align: 'right' })
                    .text(ORGANIZATION_IDENTITY.email, pageWidth - margin - 150, y + 26, { width: 150, align: 'right' });

                y += 45;
                doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).strokeColor('#DDE1E6').stroke();

                // ─── TITLE BANNER ───
                y += 15;
                const bannerWidth = 300;
                const bannerX = (pageWidth - bannerWidth) / 2;
                doc.roundedRect(bannerX, y, bannerWidth, 36, 4).fill(navy);

                doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('REÇU DE DON', bannerX, y + 6, { width: bannerWidth, align: 'center' });
                doc.fontSize(10).font('Helvetica').fillColor('#FFFFFF')
                    .text(`N° DON-${data.receiptNumber}`, bannerX, y + 22, { width: bannerWidth, align: 'center' });

                y += 50;

                // ─── PARTIES SECTION ───
                const colWidth = (contentWidth - 15) / 2;

                // Organisme bénéficiaire
                doc.roundedRect(margin, y, colWidth, 60, 3).fill(lightBg);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(navy)
                    .text('ORGANISME BÉNÉFICIAIRE', margin + 10, y + 10);
                doc.fontSize(10).font('Helvetica').fillColor(darkText)
                    .text(ORGANIZATION_IDENTITY.name, margin + 10, y + 22);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(ORGANIZATION_IDENTITY.address, margin + 10, y + 34, { width: colWidth - 20 })
                    .text(`IFU/RCCM : ${ORGANIZATION_IDENTITY.taxId}`, margin + 10, y + 46, { width: colWidth - 20 });

                // Donateur
                const rightX = margin + colWidth + 15;
                doc.roundedRect(rightX, y, colWidth, 60, 3).fill(lightBg);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(navy)
                    .text('DONATEUR', rightX + 10, y + 10);
                doc.fontSize(10).font('Helvetica').fillColor(darkText)
                    .text(data.donor.name, rightX + 10, y + 22);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(data.donor.email || 'Email non renseigné', rightX + 10, y + 34)
                    .text(data.donor.phone || 'Téléphone non renseigné', rightX + 10, y + 46);

                y += 75;

                // ─── AMOUNT TABLE ───
                doc.roundedRect(margin, y, contentWidth, 28, 3).fill(navy);
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('Désignation', margin + 12, y + 9)
                    .text('Montant / Détails', pageWidth - margin - 12, y + 9, { align: 'right', width: 150 });

                y += 28;

                const rowBg = '#FAFBFD';
                doc.rect(margin, y, contentWidth, 28).fill(rowBg);
                doc.rect(margin, y, contentWidth, 28).lineWidth(0.3).strokeColor('#DDE1E6').stroke();
                doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
                    .text(data.description || 'Don de soutien', margin + 12, y + 9, { width: contentWidth - 170 });
                doc.fontSize(10).font('Helvetica').fillColor(darkText)
                    .text(this.formatCurrency(data.amount, data.currency), pageWidth - margin - 12, y + 9, { align: 'right', width: 150 });
                y += 28;

                // Total row
                doc.roundedRect(margin, y, contentWidth, 32, 3).fill('#EBF0F8');
                doc.fontSize(11).font('Helvetica-Bold').fillColor(navy)
                    .text('TOTAL REÇU', margin + 12, y + 10)
                    .text(this.formatCurrency(data.amount, data.currency), pageWidth - margin - 12, y + 10, { align: 'right', width: 150 });

                y += 45;

                // ─── PAYMENT INFO BAR ───
                doc.roundedRect(margin, y, contentWidth, 26, 3).fill(lightBg);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text('Mode de paiement :', margin + 10, y + 8);
                doc.font('Helvetica-Bold').fillColor(darkText)
                    .text('Mobile Money (FedaPay)', margin + 105, y + 8);
                doc.font('Helvetica').fillColor(mediumText)
                    .text('Date du don :', pageWidth / 2 + 10, y + 8);
                doc.font('Helvetica-Bold').fillColor(darkText)
                    .text(this.formatDate(data.date), pageWidth / 2 + 75, y + 8);

                if (data.transactionReference) {
                    y += 20;
                    doc.fontSize(8).font('Helvetica').fillColor(mediumText)
                        .text(`Réf. transaction : ${data.transactionReference}`, margin + 10, y + 8);
                }

                y += 40;

                // ─── LEGAL MENTION ───
                doc.fontSize(8).font('Helvetica').fillColor(lightText)
                    .text(
                        `Ce reçu atteste qu'un don de ${this.formatCurrency(data.amount, data.currency)} a été reçu par ` +
                        `${ORGANIZATION_IDENTITY.name} de la part de ${data.donor.name}. ` +
                        '[Mention de déductibilité fiscale à confirmer selon le statut juridique de l\'organisme bénéficiaire.]',
                        margin, y, { width: contentWidth }
                    );

                y += 35;
                doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.3).strokeColor('#DDE1E6').stroke();
                y += 15;

                // ─── SIGNATURE ───
                doc.fontSize(9).font('Helvetica').fillColor(darkText)
                    .text('Avec nos remerciements.', margin, y);
                doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
                    .text('Pour ' + ORGANIZATION_IDENTITY.name, pageWidth - margin - 150, y, { width: 150, align: 'right' });

                y += 35;
                doc.moveTo(pageWidth - margin - 80, y).lineTo(pageWidth - margin, y).lineWidth(0.5).strokeColor('#CCC').stroke();
                doc.fontSize(8).font('Helvetica').fillColor(lightText)
                    .text('(Signature & cachet)', pageWidth - margin - 80, y + 5, { width: 80, align: 'center' });

                // ─── FOOTER BAR ───
                const footerY = doc.page.height - 35;
                doc.rect(0, footerY, pageWidth, 35).fill(navy);
                doc.fontSize(7).font('Helvetica').fillColor('#FFFFFF')
                    .text(
                        'Reçu généré automatiquement par la plateforme HopeGestion — www.hopegestion.com',
                        0, footerY + 13, { align: 'center', width: pageWidth }
                    );

                doc.end();
                stream.on('finish', resolve);
                stream.on('error', reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private formatCurrency(amount: number, currency: string): string {
        if (currency === 'XOF') {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF'
            }).format(amount).replace(/[  ]/g, ' ');
        }
        return `${amount.toLocaleString('fr-FR')} ${currency}`;
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }
}

// Export singleton
export const donationReceiptService = new DonationReceiptService();
