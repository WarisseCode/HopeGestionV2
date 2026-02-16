// backend/services/EmailService.ts

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// 🔒 SECURITY: Email service for password reset and notifications
class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Configure email transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email service configuration error:', error.message);
                
                // 💡 Proactive help for Gmail users
                if (error.message.includes('534-5.7.9')) {
                    console.error('💡 TIP: Gmail is blocking the login. You likely need an "App Password" (Mot de passe d\'application).');
                    console.error('👉 Generate one at: https://myaccount.google.com/apppasswords');
                }
            } else {
                console.log('✅ Email service ready');
            }
        });
    }

    /**
     * Send password reset email
     * @param to - Recipient email address
     * @param resetToken - Plain text reset token (will be in URL)
     * @param userName - User's name for personalization
     * @param ipAddress - IP that requested reset
     */
    async sendPasswordResetEmail(
        to: string, 
        resetToken: string, 
        userName: string,
        ipAddress: string = 'unknown'
    ): Promise<boolean> {
        try {
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
                to,
                subject: 'Réinitialisation de votre mot de passe - Hope Gestion',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                            .button { display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
                            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
                            .code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 3px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🔐 Réinitialisation de mot de passe</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour <strong>${userName}</strong>,</p>
                                
                                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Hope Gestion.</p>
                                
                                <p style="text-align: center;">
                                    <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
                                </p>
                                
                                <p>Ou copiez ce lien dans votre navigateur :</p>
                                <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px; font-size: 12px;">
                                    ${resetLink}
                                </p>
                                
                                <div class="warning">
                                    <strong>⏱️ Important :</strong> Ce lien expire dans <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois.
                                </div>
                                
                                <p style="font-size: 14px; color: #64748b;">
                                    <strong>Informations de sécurité :</strong><br>
                                    Demande effectuée depuis l'adresse IP : <span class="code">${ipAddress}</span>
                                </p>
                                
                                <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;">
                                
                                <p style="font-size: 13px; color: #64748b;">
                                    Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email. Votre mot de passe actuel reste inchangé.
                                </p>
                            </div>
                            <div class="footer">
                                <p>Hope Gestion - Plateforme de Gestion Immobilière</p>
                                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
Bonjour ${userName},

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetLink}

⏱️ Ce lien expire dans 15 minutes et ne peut être utilisé qu'une seule fois.

Informations de sécurité :
Demande effectuée depuis l'adresse IP : ${ipAddress}

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

---
Hope Gestion
Plateforme de Gestion Immobilière
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${to} (MessageId: ${info.messageId})`);
            return true;

        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            return false;
        }
    }

    /**
     * Send rent payment confirmation to tenant
     */
    async sendRentPaymentConfirmation(
        to: string, 
        tenantName: string, 
        amount: string, 
        period: string,
        receiptUrl: string
    ): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
                to,
                subject: `Confirmation de paiement - Loyer ${period}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                            .details { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0; }
                            .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✅ Paiement Confirmé</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour <strong>${tenantName}</strong>,</p>
                                <p>Nous avons bien reçu votre paiement pour le loyer de <strong>${period}</strong>.</p>
                                
                                <div class="details">
                                    <p><strong>Montant payé :</strong> ${amount} FCFA</p>
                                    <p><strong>Période :</strong> ${period}</p>
                                    <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                                </div>

                                <p>Votre quittance est disponible en téléchargement :</p>
                                <p style="text-align: center;">
                                    <a href="${receiptUrl}" class="button">📄 Télécharger ma Quittance</a>
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('❌ Error sending rent payment confirmation:', error);
            return false;
        }
    }

    /**
     * Notify manager/owner of received payment
     */
    async sendPaymentReceivedNotification(
        to: string,
        managerName: string,
        tenantName: string,
        amount: string,
        period: string
    ): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
                to,
                subject: `💰 Nouveau paiement reçu - ${tenantName}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                            .details { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>💰 Paiement Reçu</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour <strong>${managerName}</strong>,</p>
                                <p>Le locataire <strong>${tenantName}</strong> vient de régler son loyer.</p>
                                
                                <div class="details">
                                    <p><strong>Locataire :</strong> ${tenantName}</p>
                                    <p><strong>Montant :</strong> ${amount} FCFA</p>
                                    <p><strong>Période :</strong> ${period}</p>
                                    <p><strong>Mode :</strong> Mobile Money (FedaPay)</p>
                                </div>

                                <p>La quittance a été générée et envoyée automatiquement au locataire.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('❌ Error sending payment notification to manager:', error);
            return false;
        }
    }
    /**
     * Send confirmation that password was successfully reset
     */
    async sendPasswordResetConfirmation(
        to: string,
        userName: string,
        ipAddress: string
    ): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
                to,
                subject: 'Confirmation de réinitialisation de mot de passe',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
                            .code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 3px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✅ Mot de passe modifié</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour <strong>${userName}</strong>,</p>
                                <p>Le mot de passe de votre compte Hope Gestion a été modifié avec succès.</p>
                                
                                <p style="margin-top: 20px;">Si vous êtes à l'origine de cette action, vous pouvez ignorer cet email.</p>
                                
                                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0;">
                                    <strong>⚠️ Sécurité :</strong> Si vous n'avez pas effectué ce changement, veuillez contacter le support immédiatement.
                                </div>

                                <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
                                    Modification effectuée depuis l'adresse IP : <span class="code">${ipAddress}</span>
                                </p>
                            </div>
                            <div class="footer">
                                <p>Hope Gestion - Plateforme de Gestion Immobilière</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('❌ Error sending password reset confirmation:', error);
            return false;
        }
    }
}

export default new EmailService();
