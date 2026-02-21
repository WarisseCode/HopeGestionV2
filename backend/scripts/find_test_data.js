const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const fs = require('fs');
const path = require('path');

async function findTestData() {
    const client = await pool.connect();
    try {
        let output = "";
        output += "Searching for Owner-User pairs...\n";
        
        const res = await client.query(`
            SELECT u.id as user_id, u.email, o.id as owner_id, o.manager_code, o.name
            FROM users u
            JOIN owners o ON u.email = o.email
            WHERE u.role IN ('proprietaire', 'gestionnaire')
            LIMIT 5
        `);
        
        if (res.rows.length === 0) {
            output += "No matching User-Owner pair found by email.\n";
            // Fallback: Just list some owners
            const owners = await client.query('SELECT id, name, manager_code, email FROM owners LIMIT 5');
            output += "Here are some owners (check if users exist for these emails):\n";
            owners.rows.forEach(r => output += JSON.stringify(r) + "\n");
        } else {
            output += "Found matching pairs:\n";
            res.rows.forEach(r => output += JSON.stringify(r) + "\n");
        }
        
        fs.writeFileSync(path.join(__dirname, 'test_data.log'), output);
        console.log("Data written to test_data.log");

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

findTestData();
