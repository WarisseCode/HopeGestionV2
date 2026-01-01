// backend/scripts/verifyCronLogic.ts
import { CronService } from '../services/CronService';
import pool from '../db/database';

async function verifyLogic() {
    try {
        console.log('🧪 Verifying Cron Logic (Standalone)...');
        
        // 1. Trigger Logic
        console.log('⚡ Running checkLatePayments(force=true)...');
        await CronService.checkLatePayments(true);

        console.log('⚡ Running checkLeaseExpirations()...');
        await CronService.checkLeaseExpirations();

        // 2. Check Results for Auto Manager
        const userRes = await pool.query("SELECT id FROM users WHERE email = 'auto_manager@hope.com'");
        if (userRes.rows.length === 0) {
            console.error('❌ Auto Manager user not found. Did you run seedLeases?');
            return;
        }
        const userId = userRes.rows[0].id;

        const notifRes = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        console.log(`\n📋 Found ${notifRes.rows.length} notifications for Auto Manager:`);
        notifRes.rows.forEach(n => {
            console.log(`- [${n.type.toUpperCase()}] ${n.title}: ${n.message}`);
        });

        // 3. Assertions
        const lateRentAlert = notifRes.rows.find(n => n.title.includes('Retard de Loyer'));
        const expiryAlert = notifRes.rows.find(n => n.title.includes('Expiration'));

        if (lateRentAlert && expiryAlert) {
            console.log('\n🎉 SUCCESS: Automation logic works correctly!');
        } else {
            console.log('\n⚠️ PARTIAL SUCCESS: Logic ran but missing some alerts.');
            if (!lateRentAlert) console.log('❌ Missing Late Rent Alert');
            if (!expiryAlert) console.log('❌ Missing Expiry Alert');
        }

    } catch (error) {
        console.error('❌ Error executing logic:', error);
    } finally {
        await pool.end();
    }
}

verifyLogic();
