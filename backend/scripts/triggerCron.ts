// backend/scripts/triggerCron.ts

const BASE_URL = 'http://127.0.0.1:5000';
const EMAIL = 'auto_manager@hope.com';
const PASSWORD = 'AutoPass123!';

async function runTest() {
    try {
        console.log('🧪 Starting Automation Test...');
        
        // 1. Authenticate
        console.log('🔑 Logging in...');
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const { token } = await loginRes.json();
        const headers = { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        };
        console.log('✅ Login successful.');

        // 2. Trigger Automation
        console.log('⚡ Triggering Cron Jobs...');
        const triggerRes = await fetch(`${BASE_URL}/api/notifications/trigger-automation`, {
            method: 'POST',
            headers: headers
        });
        
        const triggerData = await triggerRes.json();
        console.log('Response:', triggerData);

        // 3. Verify Notifications
        console.log('📩 Checking Notifications...');
        const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
            headers: headers
        });
        const { notifications } = await notifRes.json();

        console.log(`\n📋 Found ${notifications.length} notifications:`);
        notifications.forEach((n: any) => {
            console.log(`- [${n.type.toUpperCase()}] ${n.title}: ${n.message}`);
        });

        // Check for specific alerts
        const lateRentAlert = notifications.find((n: any) => n.title.includes('Retard de Loyer'));
        const expiryAlert = notifications.find((n: any) => n.title.includes('Expiration'));

        if (lateRentAlert && expiryAlert) {
            console.log('\n🎉 SUCCESS: Both automated alerts were generated!');
        } else {
            console.log('\n⚠️ PARTIAL SUCCESS: Missing some alerts.');
            if (!lateRentAlert) console.log('❌ Missing Late Rent Alert');
            if (!expiryAlert) console.log('❌ Missing Expiry Alert');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

runTest();
