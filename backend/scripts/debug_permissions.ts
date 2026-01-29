
import pool from '../db/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function debugPermissions() {
    try {
        console.log('--- USER ROLES (Ayinla) ---');
        const userRes = await pool.query("SELECT id, email, role FROM users WHERE email LIKE '%ayinla%'");
        console.table(userRes.rows);

        console.log('\n--- PERMISSION MATRIX (Distinct Roles) ---');
        const rolesRes = await pool.query("SELECT DISTINCT role FROM permission_matrix");
        console.table(rolesRes.rows);

        console.log('\n--- PERMISSION MATRIX (Full for User Role) ---');
        if (userRes.rows.length > 0) {
            const role = userRes.rows[0].role;
            const permsRes = await pool.query("SELECT * FROM permission_matrix WHERE role = $1", [role]);
            console.table(permsRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugPermissions();
