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
     * Create the PDF document
     */
    private async createPDF(data: ReceiptData, filepath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const stream = fs.createWriteStream(filepath);

                doc.pipe(stream);

                // Header
                doc.fontSize(20).font('Helvetica-Bold').text('QUITTANCE DE LOYER', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica').text(`N° ${data.receiptNumber}`, { align: 'center' });
                doc.moveDown(2);

                // Issuer (Owner) - Left
                doc.fontSize(12).font('Helvetica-Bold').text('Émetteur (Bailleur)');
                doc.fontSize(10).font('Helvetica')
                    .text(data.owner.name)
                    .text(data.owner.address)
                    .moveDown();

                // Recipient (Tenant) - Left
                doc.fontSize(12).font('Helvetica-Bold').text('Locataire');
                doc.fontSize(10).font('Helvetica')
                    .text(data.tenant.name)
                    .text(data.tenant.address)
                    .moveDown(2);

                // Main Content Box
                const boxTop = doc.y;
                doc.roundedRect(50, boxTop, 495, 150, 5).stroke();

                doc.y = boxTop + 15;
                doc.fontSize(11).font('Helvetica-Bold')
                    .text('Je soussigné(e), reconnais avoir reçu de :', { align: 'center' });
                doc.moveDown(0.3);
                doc.fontSize(12).text(data.tenant.name, { align: 'center' });
                doc.moveDown(0.5);

                doc.fontSize(11).font('Helvetica')
                    .text('La somme de :', { align: 'center' });
                doc.moveDown(0.3);
                doc.fontSize(16).font('Helvetica-Bold')
                    .text(this.formatCurrency(data.payment.amount), { align: 'center' });
                doc.moveDown(0.5);

                doc.fontSize(10).font('Helvetica')
                    .text(`Au titre du loyer pour la période : ${data.payment.period}`, { align: 'center' })
                    .text(`Bien situé : ${data.property.address}`, { align: 'center' });

                doc.y = boxTop + 155;
                doc.moveDown();

                // Payment Details Table
                const tableTop = doc.y + 10;
                doc.fontSize(11).font('Helvetica-Bold').text('Détails du paiement', 50, tableTop);
                
                const detailsY = tableTop + 25;
                doc.fontSize(10).font('Helvetica');
                
                // Row 1
                doc.text('Date de paiement :', 50, detailsY, { width: 200, continued: false });
                doc.text(this.formatDate(data.date), 280, detailsY, { align: 'right' });
                
                // Row 2
                doc.text('Mode de paiement :', 50, detailsY + 20, { width: 200, continued: false });
                doc.text(data.payment.method, 280, detailsY + 20, { align: 'right' });
                
                // Row 3
                if (data.payment.reference) {
                    doc.text('Référence transaction :', 50, detailsY + 40, { width: 200, continued: false });
                    doc.text(data.payment.reference, 280, detailsY + 40, { align: 'right' });
                }

                doc.y = detailsY + 70;
                doc.moveDown(2);

                // Legal Notice
                doc.fontSize(8).font('Helvetica').fillColor('#666')
                    .text(
                        'Cette quittance annule tous les reçus qui auraient pu être donnés en acompte. ' +
                        'Elle ne libère le locataire que pour la période indiquée.',
                        { align: 'center', width: 495 }
                    );

                doc.moveDown(2);

                // Signature
                doc.fillColor('#000').fontSize(10)
                    .text(`Fait à Cotonou, le ${this.formatDate(new Date())}`, { align: 'right' });
                doc.moveDown(0.5);
                doc.fontSize(9).font('Helvetica-Bold')
                    .text('Le Bailleur', { align: 'right' });
                doc.moveDown(3);
                doc.fontSize(8).font('Helvetica').text('(Signature)', { align: 'right' });

                // Footer
                doc.fontSize(7).fillColor('#999')
                    .text('Document généré automatiquement par HopeGestion', 50, doc.page.height - 30, {
                        align: 'center'
                    });

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
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount);
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
