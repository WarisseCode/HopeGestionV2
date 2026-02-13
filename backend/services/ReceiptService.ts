// backend/services/ReceiptService.ts
// Service for generating PDF rent receipts (quittances de loyer)

import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import pool from '../db/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RECEIPTS_DIR = path.join(__dirname, '../../uploads/receipts');

// Ensure receipts directory exists
fs.ensureDirSync(RECEIPTS_DIR);

// ============================================================================
// TYPES
// ============================================================================

export interface ReceiptData {
    paymentId: number;
    receiptNumber: string;
    date: Date;
    tenant: {
        name: string;
        address: string;
    };
    owner: {
        name: string;
        address: string;
    };
    property: {
        address: string;
        type: string;
    };
    payment: {
        amount: number;
        method: string;
        period: string;
        reference?: string;
    };
    lease: {
        startDate: Date;
        monthlyRent: number;
    };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ReceiptService {

    /**
     * Generate a PDF receipt for a payment
     */
    async generateReceipt(paymentId: number): Promise<string> {
        try {
            // 1. Fetch payment details from database
            const receiptData = await this.getReceiptData(paymentId);

            // 2. Generate PDF
            const filename = `quittance_${receiptData.receiptNumber}_${Date.now()}.pdf`;
            const filepath = path.join(RECEIPTS_DIR, filename);

            await this.createPDF(receiptData, filepath);

            // 3. Store the URL in database
            const relativeUrl = `/uploads/receipts/${filename}`;
            await pool.query(
                'UPDATE payments SET quittance_url = $1 WHERE id = $2',
                [relativeUrl, paymentId]
            );

            console.log(`[ReceiptService] Generated receipt: ${filename}`);
            return relativeUrl;

        } catch (error) {
            console.error('[ReceiptService] Error generating receipt:', error);
            throw error;
        }
    }

    /**
     * Fetch all data needed for the receipt
     */
    private async getReceiptData(paymentId: number): Promise<ReceiptData> {
        const result = await pool.query(`
            SELECT 
                p.id as payment_id,
                p.montant,
                p.date_paiement,
                p.mode_paiement,
                p.reference_transaction,
                ps.description as period_description,
                ps.due_date,
                l.id as lease_id,
                l.loyer_actuel as monthly_rent,
                l.date_debut as lease_start,
                t.nom as tenant_last_name,
                t.prenoms as tenant_first_name,
                t.adresse as tenant_address,
                b.nom as building_name,
                b.adresse as building_address,
                lot.numero as lot_number,
                lot.type as lot_type,
                o.nom as owner_name,
                'Adresse du propriétaire' as owner_address
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            JOIN tenants t ON l.tenant_id = t.id
            JOIN lots lot ON l.lot_id = lot.id
            JOIN buildings b ON lot.building_id = b.id
            JOIN owners o ON l.owner_id = o.id
            LEFT JOIN payment_schedules ps ON p.schedule_id = ps.id
            WHERE p.id = $1
        `, [paymentId]);

        if (result.rows.length === 0) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        const row = result.rows[0];

        // Generate receipt number (format: YYYYMM-PAYMENT_ID)
        const date = new Date(row.date_paiement);
        const receiptNumber = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${paymentId}`;

        return {
            paymentId,
            receiptNumber,
            date: date,
            tenant: {
                name: `${row.tenant_first_name} ${row.tenant_last_name}`,
                address: row.tenant_address || 'Non renseigné'
            },
            owner: {
                name: row.owner_name,
                address: row.owner_address
            },
            property: {
                address: `${row.building_address} - ${row.lot_type} ${row.lot_number}`,
                type: row.lot_type
            },
            payment: {
                amount: parseFloat(row.montant),
                method: this.getPaymentMethodLabel(row.mode_paiement),
                period: row.period_description || this.formatPeriod(date),
                reference: row.reference_transaction
            },
            lease: {
                startDate: new Date(row.lease_start),
                monthlyRent: parseFloat(row.monthly_rent)
            }
        };
    }

    /**
     * Create the PDF document with premium design
     */
    private async createPDF(data: ReceiptData, filepath: string): Promise<void> {
        const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const stream = fs.createWriteStream(filepath);
                doc.pipe(stream);

                const pageWidth = 595.28; // A4 width in points
                const margin = 50;
                const contentWidth = pageWidth - margin * 2;

                // Brand colors
                const navy = '#1A365D';
                const darkText = '#1E1E1E';
                const mediumText = '#5A5A5A';
                const lightText = '#8C8C8C';
                const lightBg = '#F5F7FA';

                // ─── HEADER ───
                let y = 40;

                // Logo
                if (fs.existsSync(LOGO_PATH)) {
                    doc.image(LOGO_PATH, margin, y - 5, { width: 120 });
                } else {
                    doc.fontSize(18).font('Helvetica-Bold').fillColor(navy)
                        .text('HOPE GESTION', margin, y);
                    doc.fontSize(8).font('Helvetica').fillColor(mediumText)
                        .text('Gestion Immobilière Simplifiée', margin, y + 18);
                }

                // Date & contact — right side
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(`Cotonou, le ${this.formatDate(new Date())}`, pageWidth - margin - 150, y, { width: 150, align: 'right' })
                    .text('Tél: +229 01 02 03 04', pageWidth - margin - 150, y + 14, { width: 150, align: 'right' })
                    .text('contact@hopegestion.com', pageWidth - margin - 150, y + 26, { width: 150, align: 'right' });

                // Separator line
                y += 45;
                doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).strokeColor('#DDE1E6').stroke();

                // ─── TITLE BANNER ───
                y += 15;
                const bannerWidth = 300;
                const bannerX = (pageWidth - bannerWidth) / 2;
                doc.roundedRect(bannerX, y, bannerWidth, 36, 4).fill(navy);

                doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('QUITTANCE DE LOYER', bannerX, y + 6, { width: bannerWidth, align: 'center' });
                doc.fontSize(10).font('Helvetica').fillColor('#FFFFFF')
                    .text(`N° QUI-${data.receiptNumber}`, bannerX, y + 22, { width: bannerWidth, align: 'center' });

                y += 50;

                // ─── PARTIES SECTION ───
                const colWidth = (contentWidth - 15) / 2;

                // Bailleur box
                doc.roundedRect(margin, y, colWidth, 60, 3).fill(lightBg);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(navy)
                    .text('BAILLEUR / GESTIONNAIRE', margin + 10, y + 10);
                doc.fontSize(10).font('Helvetica').fillColor(darkText)
                    .text(data.owner.name, margin + 10, y + 22);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(data.owner.address, margin + 10, y + 34)
                    .text('Tél: +229 01 02 03 04', margin + 10, y + 46);

                // Locataire box
                const rightX = margin + colWidth + 15;
                doc.roundedRect(rightX, y, colWidth, 60, 3).fill(lightBg);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(navy)
                    .text('LOCATAIRE', rightX + 10, y + 10);
                doc.fontSize(10).font('Helvetica').fillColor(darkText)
                    .text(data.tenant.name, rightX + 10, y + 22);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text(data.property.address, rightX + 10, y + 34)
                    .text(data.tenant.address, rightX + 10, y + 46);

                y += 75;

                // ─── PAYMENT TABLE ───
                const charges = 0;
                const total = data.payment.amount + charges;

                // Table header
                doc.roundedRect(margin, y, contentWidth, 28, 3).fill(navy);
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('Désignation', margin + 12, y + 9)
                    .text('Montant / Détails', pageWidth - margin - 12, y + 9, { align: 'right', width: 150 });

                y += 28;

                // Table rows
                const rows: [string, string][] = [
                    ['Période concernée', data.payment.period],
                    ['Loyer Principal', this.formatCurrency(data.payment.amount)],
                    ['Charges locatives', this.formatCurrency(charges)],
                ];

                rows.forEach((row, i) => {
                    const rowBg = i % 2 === 0 ? '#FAFBFD' : '#FFFFFF';
                    doc.rect(margin, y, contentWidth, 28).fill(rowBg);
                    doc.rect(margin, y, contentWidth, 28).lineWidth(0.3).strokeColor('#DDE1E6').stroke();

                    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
                        .text(row[0], margin + 12, y + 9);
                    doc.fontSize(10).font('Helvetica').fillColor(darkText)
                        .text(row[1], pageWidth - margin - 12, y + 9, { align: 'right', width: 150 });
                    y += 28;
                });

                // Total row
                doc.roundedRect(margin, y, contentWidth, 32, 3).fill('#EBF0F8');
                doc.fontSize(11).font('Helvetica-Bold').fillColor(navy)
                    .text('TOTAL PAYÉ', margin + 12, y + 10)
                    .text(this.formatCurrency(total), pageWidth - margin - 12, y + 10, { align: 'right', width: 150 });

                y += 45;

                // ─── PAYMENT INFO BAR ───
                doc.roundedRect(margin, y, contentWidth, 26, 3).fill(lightBg);
                doc.fontSize(9).font('Helvetica').fillColor(mediumText)
                    .text('Mode de paiement :', margin + 10, y + 8);
                doc.font('Helvetica-Bold').fillColor(darkText)
                    .text(data.payment.method, margin + 85, y + 8);
                doc.font('Helvetica').fillColor(mediumText)
                    .text('Date de paiement :', pageWidth / 2 + 10, y + 8);
                doc.font('Helvetica-Bold').fillColor(darkText)
                    .text(this.formatDate(data.date), pageWidth / 2 + 90, y + 8);

                if (data.payment.reference) {
                    y += 20;
                    doc.fontSize(8).font('Helvetica').fillColor(mediumText)
                        .text(`Réf. transaction : ${data.payment.reference}`, margin + 10, y + 8);
                }

                y += 40;

                // ─── LEGAL MENTION ───
                doc.fontSize(8).font('Helvetica').fillColor(lightText)
                    .text(
                        'Cette quittance annule tous les reçus qui auraient pu être donnés en acompte. ' +
                        'Elle ne libère le locataire que pour la période indiquée ci-dessus.',
                        margin, y, { width: contentWidth }
                    );

                y += 25;
                doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.3).strokeColor('#DDE1E6').stroke();
                y += 15;

                // ─── SIGNATURE ───
                doc.fontSize(9).font('Helvetica').fillColor(darkText)
                    .text('Pour valoir ce que de droit.', margin, y);
                doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
                    .text('Le Gestionnaire', pageWidth - margin - 100, y, { width: 100, align: 'right' });

                y += 35;
                doc.moveTo(pageWidth - margin - 80, y).lineTo(pageWidth - margin, y).lineWidth(0.5).strokeColor('#CCC').stroke();
                doc.fontSize(8).font('Helvetica').fillColor(lightText)
                    .text('(Signature & cachet)', pageWidth - margin - 80, y + 5, { width: 80, align: 'center' });

                // ─── FOOTER BAR ───
                const footerY = doc.page.height - 35;
                doc.rect(0, footerY, pageWidth, 35).fill(navy);
                doc.fontSize(7).font('Helvetica').fillColor('#FFFFFF')
                    .text(
                        'Document généré automatiquement par la plateforme HopeGestion — www.hopegestion.com',
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

    private formatCurrency(amount: number): string {
        // Replace narrow no-break space (U+202F) and no-break space (U+00A0) with regular space
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount).replace(/[\u202F\u00A0]/g, ' ');
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }

    private formatPeriod(date: Date): string {
        return new Intl.DateTimeFormat('fr-FR', {
            month: 'long',
            year: 'numeric'
        }).format(date);
    }

    private getPaymentMethodLabel(method: string): string {
        const labels: Record<string, string> = {
            'especes': 'Espèces',
            'mobile_money': 'Mobile Money',
            'virement': 'Virement bancaire',
            'cheque': 'Chèque',
            'carte': 'Carte bancaire'
        };
        return labels[method] || method;
    }
}

// Export singleton
export const receiptService = new ReceiptService();
