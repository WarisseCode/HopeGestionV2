
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER; // Format: 'whatsapp:+14155238886'

export class WhatsAppService {
    private static client: any;
    private static isConfigured: boolean = false;

    static init() {
        if (ACCOUNT_SID && AUTH_TOKEN && WHATSAPP_FROM) {
            this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
            this.isConfigured = true;
            console.log('✅ WhatsApp Service: Connected to Twilio.');
        } else {
            console.log('⚠️ WhatsApp Service: Credentials missing. Running in SIMULATION MODE.');
            this.isConfigured = false;
        }
    }

    /**
     * Send a WhatsApp message
     * @param to Recipient number (e.g., '+22966000000')
     * @param body Message content
     */
    static async send(to: string, body: string): Promise<boolean> {
        // Formattage du numéro (s'assurer qu'il a le préfixe whatsapp:)
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        if (this.isConfigured && this.client) {
            try {
                const message = await this.client.messages.create({
                    from: WHATSAPP_FROM,
                    to: formattedTo,
                    body: body
                });
                console.log(`[WHATSAPP] 📲 Sent to ${to}. SID: ${message.sid}`);
                return true;
            } catch (error) {
                console.error('[WHATSAPP] ❌ Error sending message:', error);
                return false;
            }
        } else {
            // SIMULATION MODE
            console.log('-----------------------------------------------------');
            console.log(`[WHATSAPP SIMULATION] 📲 Sending to: ${to}`);
            console.log(`📝 Message: "${body}"`);
            console.log('-----------------------------------------------------');
            return true;
        }
    }
}

// Initialize on load
WhatsAppService.init();
