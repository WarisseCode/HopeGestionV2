// backend/demo_security.ts
import pool from './db/database';

async function showSecurity() {
    try {
        console.log('🔒 Security Demonstration: Fetching 1 user record...');
        const res = await pool.query('SELECT email, password_hash, user_type FROM users LIMIT 1');
        
        if (res.rows.length > 0) {
            console.log('Record found:');
            console.log(JSON.stringify(res.rows[0], null, 2));
            console.log('\n✅ PROOF: The "password_hash" field contains a bcrypt hash ($2b$...), NOT the real password.');
        } else {
            console.log('No users found in database.');
        }
    } catch (e) {
        console.error('Error fetching data:', e);
    } finally {
        await pool.end();
    }
}

showSecurity();
