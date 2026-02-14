
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from backend folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.PROD_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('\n=== USERS ===');
        const users = await client.query('SELECT id, nom, email, role, user_type FROM users ORDER BY id');
        users.rows.forEach(u => {
            console.log(`[${u.id}] ${u.nom} (${u.email}) - Role: ${u.role}, Type: ${u.user_type}`);
        });

        console.log('\n=== OWNERS ===');
        const owners = await client.query('SELECT id, name, type FROM owners ORDER BY id');
        owners.rows.forEach(o => {
            console.log(`[${o.id}] ${o.name} (${o.type})`);
        });

        console.log('\n=== OWNER_USER LINKS ===');
        const links = await client.query(`
            SELECT ou.owner_id, o.name as owner_name, ou.user_id, u.nom as user_name, ou.role
            FROM owner_user ou
            JOIN users u ON ou.user_id = u.id
            JOIN owners o ON ou.owner_id = o.id
        `);
        links.rows.forEach(l => {
            console.log(`Owner [${l.owner_id} ${l.owner_name}] <-> User [${l.user_id} ${l.user_name}] (${l.role})`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

debugUsers();
