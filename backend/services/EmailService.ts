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
                console.error('❌ Email service configuration error:', error);
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
     * Send password reset confirmation email
     */
    async sendPasswordResetConfirmation(to: string, userName: string, ipAddress: string = 'unknown'): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
                to,
                subject: 'Votre mot de passe a été modifié - Hope Gestion',
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
                            .success { background: #D1FAE5; border-left: 4px solid #10B981; padding: 12px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✅ Mot de passe modifié</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour <strong>${userName}</strong>,</p>
                                
                                <div class="success">
                                    Votre mot de passe Hope Gestion a été modifié avec succès.
                                </div>
                                
                                <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                                
                                <p style="font-size: 14px; color: #64748b;">
                                    <strong>Informations de sécurité :</strong><br>
                                    Modification effectuée depuis : ${ipAddress}
                                </p>
                                
                                <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;">
                                
                                <p style="font-size: 13px; color: #ef4444;">
                                    ⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement notre support.
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
            console.error('❌ Error sending confirmation email:', error);
            return false;
        }
    }
}

export default new EmailService();
