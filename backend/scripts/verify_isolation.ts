// @ts-nocheck
import axios from 'axios';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Configuration
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
    try {
        console.log(`Attempting login for ${email} at ${BASE_URL}/auth/login`);
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });
        return response.data.token;
    } catch (error) {
        console.error(`❌ Login failed for ${email}:`, error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Server is not reachable. Is the backend running?');
        }
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        throw error;
    }
}

async function verifyIsolation() {
    console.log('🧪 Starting Isolation Verification...');

    let ownerToken, managerToken, alienToken;

    // 1. Authenticate Users
    console.log('\n🔐 Authenticating test users...');
    try {
        ownerToken = await login('owner@test.com', 'password123');
        console.log('✅ Owner Authenticated');
        
        managerToken = await login('manager@test.com', 'password123');
        console.log('✅ Manager Authenticated');
        
        alienToken = await login('alien@test.com', 'password123');
        console.log('✅ Alien Owner Authenticated');
    } catch (error) {
        console.error('Authentication Error. Make sure API is running on localhost:5000');
        process.exit(1);
    }

    // 2. Fetch Entity Sets for Verification
    let mainOwnerProperty, alienProperty;
    
    // We need to know which property belongs to whom to verify
    // We can fetch this via database directly to have a ground truth
    try {
        const properties = await pool.query('SELECT id, nom, owner_id FROM buildings');
        const owners = await pool.query('SELECT id, email FROM owners');
        const users = await pool.query('SELECT id, email FROM users');

        // Map emails to owner IDs
        // Note: In our seed script, owner@test.com is linked to Owner Entity 'Test Owner Entity' (email: owner@test.com)
        // And alien@test.com to 'Alien Owner Entity'
        
        const mainOwnerId = owners.rows.find(o => o.email === 'owner@test.com').id;
        const alienOwnerId = owners.rows.find(o => o.email === 'alien@test.com').id;

        mainOwnerProperty = properties.rows.find(p => p.owner_id === mainOwnerId);
        alienProperty = properties.rows.find(p => p.owner_id === alienOwnerId);

        console.log('\n📋 Ground Truth Data:');
        console.log(`- Main Owner ID: ${mainOwnerId}`);
        console.log(`- Alien Owner ID: ${alienOwnerId}`);
        console.log(`- Main Property: ${mainOwnerProperty.nom} (ID: ${mainOwnerProperty.id})`);
        console.log(`- Alien Property: ${alienProperty.nom} (ID: ${alienProperty.id})`);

    } catch(err) {
        console.error('Error fetching ground truth:', err);
        process.exit(1);
    }

    // 3. Test Owner Isolation (Should see only Main Property)
    console.log('\n🕵️ Testing Owner Isolation (owner@test.com)...');
    try {
        const response = await axios.get(`${BASE_URL}/biens`, {
            headers: { Authorization: `Bearer ${ownerToken}` }
        });
        
        const properties = response.data; // Assuming API returns array or { buildings: [] }
        const list = Array.isArray(properties) ? properties : (properties.buildings || properties.data || []);
        
        const seesMain = list.some(p => p.id === mainOwnerProperty.id);
        const seesAlien = list.some(p => p.id === alienProperty.id);

        if (seesMain && !seesAlien) {
            console.log('✅ SUCCESS: Owner sees their property and NOT alien property.');
        } else {
            console.error('❌ FAILURE: Owner isolation broken.');
            console.error(`   Sees Main: ${seesMain}, Sees Alien: ${seesAlien}`);
            console.log('   List:', list.map(p => ({id: p.id, nom: p.nom})));
        }

    } catch (error) {
        console.error('❌ Failed to fetch properties for Owner:', error.message);
        if (error.response) console.error(error.response.data);
    }

    // 4. Test Manager Isolation (Should see Main Property, NOT Alien)
    console.log('\n🕵️ Testing Manager Isolation (manager@test.com)...');
    try {
        const response = await axios.get(`${BASE_URL}/biens`, {
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        
        const properties = response.data;
        const list = Array.isArray(properties) ? properties : (properties.buildings || properties.data || []);
        
        const seesMain = list.some(p => p.id === mainOwnerProperty.id);
        const seesAlien = list.some(p => p.id === alienProperty.id);

        if (seesMain && !seesAlien) {
            console.log('✅ SUCCESS: Manager sees assigned owner property and NOT alien property.');
        } else {
            console.error('❌ FAILURE: Manager isolation broken.');
            console.error(`   Sees Main: ${seesMain}, Sees Alien: ${seesAlien}`);
            console.log('   List:', list.map(p => ({id: p.id, nom: p.nom})));
        }
    } catch (error) {
        console.error('❌ Failed to fetch properties for Manager:', error.message);
        if (error.response) console.error(error.response.data);
    }

    // 5. Test Alien Isolation (Should see Alien Property, NOT Main)
    console.log('\n🕵️ Testing Alien Isolation (alien@test.com)...');
    try {
        const response = await axios.get(`${BASE_URL}/biens`, {
            headers: { Authorization: `Bearer ${alienToken}` }
        });
        
        const properties = response.data;
        const list = Array.isArray(properties) ? properties : (properties.buildings || properties.data || []);
        
        const seesMain = list.some(p => p.id === mainOwnerProperty.id);
        const seesAlien = list.some(p => p.id === alienProperty.id);

        if (!seesMain && seesAlien) {
            console.log('✅ SUCCESS: Alien Owner sees their property and NOT main property.');
        } else {
            console.error('❌ FAILURE: Alien isolation broken.');
            console.error(`   Sees Main: ${seesMain}, Sees Alien: ${seesAlien}`);
            console.log('   List:', list.map(p => ({id: p.id, nom: p.nom})));
        }
    } catch (error) {
        console.error('❌ Failed to fetch properties for Alien Owner:', error.message);
        if (error.response) console.error(error.response.data);
    }

    pool.end();
}

verifyIsolation();
