
// @ts-nocheck
const { Pool } = require('pg');

// Utils
const BASE_URL = 'http://127.0.0.1:5000/api';

const DB_CONFIG = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new Pool(DB_CONFIG);

async function login(email, password) {
    console.log(`Logging in ${email}...`);
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
        throw new Error(`Login failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.token;
}

async function getProperties(token) {
    const res = await fetch(`${BASE_URL}/biens`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        throw new Error(`Get Properties failed: ${res.status}`);
    }

    const data = await res.json();
    // Adjust based on API response structure: { data: [...] } or { buildings: [...] } or [...]
    return data.buildings || data.properties || data.data || (Array.isArray(data) ? data : []);
}

async function verify() {
    try {
        console.log('🧪 Starting Native Verification...');
        
        // 1. Authenticate
        const ownerToken = await login('owner@test.com', 'password123');
        const managerToken = await login('manager@test.com', 'password123');
        const alienToken = await login('alien@test.com', 'password123');
        
        console.log('✅ ALL users authenticated.');

        // 2. Get Ground Truth from DB
        const propertiesRes = await pool.query('SELECT id, nom, owner_id FROM buildings');
        const ownersRes = await pool.query('SELECT id, email FROM owners');
        
        const mainOwnerId = ownersRes.rows.find(o => o.email === 'owner@test.com').id;
        const alienOwnerId = ownersRes.rows.find(o => o.email === 'alien@test.com').id;

        const mainProperty = propertiesRes.rows.find(p => p.owner_id === mainOwnerId);
        const alienProperty = propertiesRes.rows.find(p => p.owner_id === alienOwnerId);

        console.log(`Ground Truth: MainOwnerProperty=${mainProperty.id}, AlienProperty=${alienProperty.id}`);

        // 3. Check Owner Isolation
        console.log('\nChecking Owner...');
        const ownerProps = await getProperties(ownerToken);
        const ownerSeesMain = ownerProps.some(p => p.id === mainProperty.id);
        const ownerSeesAlien = ownerProps.some(p => p.id === alienProperty.id);
        
        if (ownerSeesMain && !ownerSeesAlien) console.log('✅ Owner Isolation PASSED');
        else console.error(`❌ Owner Isolation FAILED (SeesMain:${ownerSeesMain}, SeesAlien:${ownerSeesAlien})`);

        // 4. Check Manager Isolation
        console.log('\nChecking Manager...');
        const managerProps = await getProperties(managerToken);
        const managerSeesMain = managerProps.some(p => p.id === mainProperty.id);
        const managerSeesAlien = managerProps.some(p => p.id === alienProperty.id);
        
        if (managerSeesMain && !managerSeesAlien) console.log('✅ Manager Isolation PASSED');
        else console.error(`❌ Manager Isolation FAILED (SeesMain:${managerSeesMain}, SeesAlien:${managerSeesAlien})`);

        // 5. Check Alien Isolation
        console.log('\nChecking Alien...');
        const alienProps = await getProperties(alienToken);
        const alienSeesMain = alienProps.some(p => p.id === mainProperty.id);
        const alienSeesAlien = alienProps.some(p => p.id === alienProperty.id);
        
        if (!alienSeesMain && alienSeesAlien) console.log('✅ Alien Isolation PASSED');
        else console.error(`❌ Alien Isolation FAILED (SeesMain:${alienSeesMain}, SeesAlien:${alienSeesAlien})`);

    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await pool.end();
    }
}

verify();
