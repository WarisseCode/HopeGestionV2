"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WhatsAppService_1 = require("../services/WhatsAppService");
async function testThinking() {
    console.log('🧪 Testing WhatsApp Simulation...');
    // 1. Send normal message
    await WhatsAppService_1.WhatsAppService.send('+22997000000', 'Bonjour, ceci est un test de HopeGestion.');
    // 2. Send urgent message (Rent Reminder format)
    await WhatsAppService_1.WhatsAppService.send('+22966112233', '⚠️ ALERTE: Votre loyer de Janvier est en retard.');
    console.log('✅ Test finished.');
}
testThinking();
