import pool from '../db/database';

async function fixFinancesPermission() {
    try {
        // Step 1: Ensure 'finances' entries exist (copy from 'finance')
        const r1 = await pool.query(
            "INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate) " +
            "SELECT role, 'finances', can_read, can_write, can_delete, can_validate " +
            "FROM permission_matrix WHERE module = 'finance' " +
            "ON CONFLICT (role, module) DO NOTHING"
        );
        console.log('Step 1: Ensured finances entries exist. Rows:', r1.rowCount);

        // Step 2: Grant write permission on finances for gestionnaire
        const r2 = await pool.query(
            "UPDATE permission_matrix SET can_write = true WHERE role = 'gestionnaire' AND module IN ('finance', 'finances')"
        );
        console.log('Step 2: Granted write on finances for gestionnaire. Rows:', r2.rowCount);

        // Step 3: Show final state
        const check = await pool.query(
            "SELECT role, module, can_read, can_write, can_delete, can_validate " +
            "FROM permission_matrix WHERE module IN ('finance', 'finances') ORDER BY role, module"
        );
        console.log('\nFinal permission_matrix for finance/finances:');
        console.table(check.rows);

        process.exit(0);
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixFinancesPermission();
