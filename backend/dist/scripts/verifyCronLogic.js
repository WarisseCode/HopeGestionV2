"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/verifyCronLogic.ts
const CronService_1 = require("../services/CronService");
const database_1 = __importDefault(require("../db/database"));
async function verifyLogic() {
    try {
        console.log('🧪 Verifying Cron Logic (Standalone)...');
        // 1. Trigger Logic - Use actual CronService methods
        console.log('⚡ Running checkReminders()...');
        await CronService_1.CronService.checkReminders();
        console.log('⚡ Running checkInterventionAlerts()...');
        await CronService_1.CronService.checkInterventionAlerts();
        // 2. Check Results
        console.log('\\n📋 Cron verification completed.');
        console.log('🎉 SUCCESS: Automation logic executed without errors!');
    }
    catch (error) {
        console.error('❌ Error executing logic:', error);
    }
    finally {
        await database_1.default.end();
    }
}
verifyLogic();
