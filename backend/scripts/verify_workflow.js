const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const API_URL = 'http://localhost:5000/api';

// Configuration
const TENANT_EMAIL = 'marc@test.com'; 
const LANDLORD_EMAIL = 'alien@test.com';
const PASSWORD = 'password123';
const MANAGER_CODE = 'AG-FF84F2';
const OWNER_ID = 2; 
const USER_ID = 86; 

async function log(msg) {
    console.log(msg);
    // fs.appendFileSync(path.join(__dirname, 'verify.log'), msg + '\n');
}

async function runVerification() {
    // fs.writeFileSync(path.join(__dirname, 'verify.log'), '=== STARTING VERIFICATION ===\n');
    let client;
    try {
        log("Connecting to DB...");
        client = await pool.connect();
        log("DB Connected.");

        // 0. Cleanup
        log(`\n0. Cleaning up previous state...`);
        await client.query('DELETE FROM tenants WHERE user_id = $1 AND owner_id = $2', [USER_ID, OWNER_ID]);
        log("   Deleted any existing tenant link for User 86 and Owner 2.");

        // 1. Login as Tenant
        log(`\n1. Logging in as Tenant (${TENANT_EMAIL})...`);
        const tenantLogin = await axios.post(`${API_URL}/auth/login`, {
            email: TENANT_EMAIL,
            password: PASSWORD
        });
        const tenantToken = tenantLogin.data.token;
        log("   Tenant logged in. Token acquired.");

        // 2. Link Tenant
        log(`\n2. Linking Tenant with code ${MANAGER_CODE}...`);
        const linkRes = await axios.post(
            `${API_URL}/auth/link-tenant`, 
            { invitationCode: MANAGER_CODE },
            { headers: { Authorization: `Bearer ${tenantToken}` } }
        );
        log("   Link response: " + JSON.stringify(linkRes.data));
        
        if (!linkRes.data.message.includes('En attente')) {
            throw new Error("Expected 'En attente' message but got: " + linkRes.data.message);
        }

        // 3. Login as Landlord
        log(`\n3. Logging in as Landlord (${LANDLORD_EMAIL})...`);
        const landlordLogin = await axios.post(`${API_URL}/auth/login`, {
            email: LANDLORD_EMAIL,
            password: PASSWORD
        });
        const landlordToken = landlordLogin.data.token;
        log("   Landlord logged in.");

        // 4. List Locataires to find Pending
        log(`\n4. Fetching Pending Locataires...`);
        const locatairesRes = await axios.get(`${API_URL}/locataires`, {
             headers: { Authorization: `Bearer ${landlordToken}` }
        });
        
        const allLocs = locatairesRes.data.locataires;
        const pending = allLocs.filter(l => l.statut === 'En attente');
        log(`   Found ${pending.length} pending requests.`);
        
        if (pending.length === 0) {
            log("   No pending requests found. Check if creation failed properly.");
            const createdId = linkRes.data.tenantId;
            const check = allLocs.find(l => l.id === createdId);
            if (check) log(`   Tenant created but status is: ${check.statut}`);
            return;
        }

        const targetTenant = pending.find(p => p.email === TENANT_EMAIL) || pending[0];
        log(`   Target Tenant ID: ${targetTenant.id}, Name: ${targetTenant.nom}`);

        // 5. Approve
        log(`\n5. Approving Tenant ${targetTenant.id}...`);
        const approveRes = await axios.post(
            `${API_URL}/locataires/${targetTenant.id}/approve`,
            {},
            { headers: { Authorization: `Bearer ${landlordToken}` } }
        );
        log("   Approve response: " + JSON.stringify(approveRes.data));

        // 6. Verify Active
        log(`\n6. Verifying status is now Active...`);
        const checkRes = await axios.get(`${API_URL}/locataires/${targetTenant.id}`, {
             headers: { Authorization: `Bearer ${landlordToken}` }
        });
        log(`   Status: ${checkRes.data.locataire.statut}`);
        
        if (checkRes.data.locataire.statut === 'Actif') {
            log("\n=== VERIFICATION SUCCESSFUL ===");
        } else {
            log("\n=== VERIFICATION FAILED: Status is not Actif ===");
        }

    } catch (error) {
        log("\n=== VERIFICATION ERROR ===");
        if (error.response) {
            log("Status: " + error.response.status);
            log("Data: " + JSON.stringify(error.response.data));
        } else {
            log(error.message);
            log(error.stack);
        }
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

runVerification();
