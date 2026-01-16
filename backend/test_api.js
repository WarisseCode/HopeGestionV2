
const pool = require('./db/database').default;

async function test() {
    try {
        const userId = 1; // Assuming user 1 for test
        
        console.log('--- Testing Notifications Query ---');
        const notifs = await pool.query('SELECT * FROM notifications WHERE user_id = $1 LIMIT 5', [userId]);
        console.log('Notifications count:', notifs.rowCount);
        
        console.log('--- Testing Alerts Query ---');
        // Simple count of active leases as a proxy for alerts logic
        const leases = await pool.query('SELECT COUNT(*) FROM leases WHERE statut = \'actif\'');
        console.log('Active leases:', leases.rows[0].count);

        console.log('--- Testing Settings Query ---');
        const settings = await pool.query('SELECT * FROM notification_settings WHERE user_id = $1', [userId]);
        console.log('Settings count:', settings.rowCount);
        
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

test();
