"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER; // Format: 'whatsapp:+14155238886'
class WhatsAppService {
    static client;
    static isConfigured = false;
    static init() {
        if (ACCOUNT_SID && AUTH_TOKEN && WHATSAPP_FROM) {
            this.client = (0, twilio_1.default)(ACCOUNT_SID, AUTH_TOKEN);
            this.isConfigured = true;
            console.log('✅ WhatsApp Service: Connected to Twilio.');
        }
        else {
            console.log('⚠️ WhatsApp Service: Credentials missing. Running in SIMULATION MODE.');
            this.isConfigured = false;
        }
    }
    /**
     * Send a WhatsApp message
     * @param to Recipient number (e.g., '+22966000000')
     * @param body Message content
     */
    static async send(to, body) {
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
            }
            catch (error) {
                console.error('[WHATSAPP] ❌ Error sending message:', error);
                return false;
            }
        }
        else {
            // SIMULATION MODE
            console.log('-----------------------------------------------------');
            console.log(`[WHATSAPP SIMULATION] 📲 Sending to: ${to}`);
            console.log(`📝 Message: "${body}"`);
            console.log('-----------------------------------------------------');
            return true;
        }
    }
}
exports.WhatsAppService = WhatsAppService;
// Initialize on load
WhatsAppService.init();
