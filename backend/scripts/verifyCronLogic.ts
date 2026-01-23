// backend/scripts/verifyCronLogic.ts
import { CronService } from '../services/CronService';
import pool from '../db/database';

async function verifyLogic() {
    try {
        console.log('🧪 Verifying Cron Logic (Standalone)...');
        
        // 1. Trigger Logic - Use actual CronService methods
        console.log('⚡ Running checkReminders()...');
        await CronService.checkReminders();

        console.log('⚡ Running checkInterventionAlerts()...');
        await CronService.checkInterventionAlerts();

        // 2. Check Results
        console.log('\\n📋 Cron verification completed.');
        console.log('🎉 SUCCESS: Automation logic executed without errors!');

    } catch (error) {
        console.error('❌ Error executing logic:', error);
    } finally {
        await pool.end();
    }
}

verifyLogic();

