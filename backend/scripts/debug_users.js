
console.log('Script starting...');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debugUsers() {
    const dbUrl = "postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion";
    console.log('Using hardcoded DB URL');

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000 
    });

    try {
        console.log('Connecting...');
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
            WHERE ou.is_active = TRUE
        `);
        links.rows.forEach(l => {
            console.log(`Owner [${l.owner_id} ${l.owner_name}] <-> User [${l.user_id} ${l.user_name}] (${l.role})`);
        });

        // Check Orphan Data (Buildings without Owner or with invalid Owner)
        const orphanBuildings = await client.query('SELECT id, nom, owner_id FROM buildings WHERE owner_id IS NULL');
        console.log(`\n=== ORPHAN BUILDINGS (owner_id IS NULL): ${orphanBuildings.rows.length} ===`);
        orphanBuildings.rows.forEach(b => console.log(`- ${b.nom} [${b.id}]`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

debugUsers();
