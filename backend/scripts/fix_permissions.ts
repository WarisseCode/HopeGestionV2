
import pool from '../db/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixPermissions() {
    try {
        console.log('--- FIXING PERMISSIONS ---');
        
        const modules = ['dashboard', 'biens', 'locataires', 'finance', 'users', 'owners', 'documents'];
        const rolesTarget = ['proprietaire', 'owner', 'Propriétaire']; // Cover all potential case variations

        for (const role of rolesTarget) {
            console.log(`Adding permissions for role: ${role}`);
            for (const module of modules) {
                // Grant FULL access to owner for their own data (RLS handles data isolation, this handles feature access)
                await pool.query(`
                    INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
                    VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE)
                    ON CONFLICT (role, module) 
                    DO UPDATE SET can_read=TRUE, can_write=TRUE, can_delete=TRUE, can_validate=TRUE
                `, [role, module]);
            }
        }
        
        console.log('✅ Permissions added successfully for Owner roles.');

    } catch (err) {
        console.error('❌ Error fixing permissions:', err);
    } finally {
        await pool.end();
    }
}

fixPermissions();
