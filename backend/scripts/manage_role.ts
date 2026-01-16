
import pool from '../db/database';

const args = process.argv.slice(2);
const email = args[0];
const newRole = args[1]; // 'admin', 'gestionnaire', etc.

if (!email || !newRole) {
    console.error('Usage: npx ts-node scripts/manage_role.ts <email> <role>');
    process.exit(1);
}

async function updateRole() {
    try {
        const res = await pool.query("UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role", [newRole, email]);
        if (res.rows.length === 0) {
            console.error(`User ${email} not found.`);
        } else {
            console.log(`Updated ${email} to role: ${newRole}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateRole();
