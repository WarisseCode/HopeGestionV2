
import pool from '../db/database';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

async function seedData() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding Test Data...');

        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Create Proprietaire User
        console.log('Creating Owner User...');
        const ownerUserRes = await pool.query(`
            INSERT INTO users (nom, email, password_hash, role, user_type, statut, telephone, created_at)
            VALUES ($1, $2, $3, $4, $4, 'active', '00000001', NOW())
            RETURNING id, email
        `, ['Test Owner', 'owner@test.com', passwordHash, 'proprietaire']);
        const ownerUser = ownerUserRes.rows[0];

        // 2. Create Owner Entity (linked by email)
        console.log('Creating Owner Entity...');
        const ownerEntityRes = await pool.query(`
            INSERT INTO owners (name, email, phone, type, is_active, created_at)
            VALUES ($1, $2, '00000001', $3, $4, NOW())
            RETURNING id, name
        `, ['Test Owner Entity', 'owner@test.com', 'individual', true]);
        const ownerEntity = ownerEntityRes.rows[0];

        // 2b. Link Owner User to Owner Entity
        console.log('Linking Owner User to Owner Entity...');
        await pool.query(`
            INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
            VALUES ($1, $2, 'owner', CURRENT_DATE, TRUE)
        `, [ownerEntity.id, ownerUser.id]);

        // 3. Create Gestionnaire User
        console.log('Creating Gestionnaire User...');
        const managerUserRes = await pool.query(`
            INSERT INTO users (nom, email, password_hash, role, user_type, statut, telephone, created_at)
            VALUES ($1, $2, $3, $4, $4, 'active', '00000002', NOW())
            RETURNING id, email
        `, ['Test Manager', 'manager@test.com', passwordHash, 'gestionnaire']);
        const managerUser = managerUserRes.rows[0];

        // 4. Assign Gestionnaire to Owner
        console.log('Assigning Gestionnaire to Owner...');
        await client.query(`
            INSERT INTO owner_user (
                user_id, owner_id, role, is_active, start_date,
                can_view_finances, can_edit_properties, can_manage_tenants,
                can_manage_contracts, can_validate_payments, can_manage_users,
                can_delete_data
            )
            VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11)
        `, [
            managerUser.id, 
            ownerEntity.id, 
            'manager', 
            true, 
            true, true, true, true, true, true, true
        ]);

        // 5. Create Alien Owner (to test isolation)
        console.log('Creating Alien Owner (for isolation test)...');
        const alienOwnerRes = await pool.query(`
            INSERT INTO users (nom, email, password_hash, role, user_type, statut, telephone, created_at)
            VALUES ($1, $2, $3, $4, $4, 'actif', '00000003', NOW())
            RETURNING id, email
        `, ['Alien Owner', 'alien@test.com', passwordHash, 'proprietaire']);
        const alienUser = alienOwnerRes.rows[0];

        const alienEntityRes = await pool.query(`
            INSERT INTO owners (name, email, phone, type, is_active, created_at)
            VALUES ($1, $2, '00000003', $3, $4, NOW())
            RETURNING id, name
        `, ['Alien Owner Entity', 'alien@test.com', 'individual', true]);
        const alienEntity = alienEntityRes.rows[0];

        // Link Alien User to Alien Owner Entity
        await pool.query(`
            INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
            VALUES ($1, $2, 'owner', CURRENT_DATE, TRUE)
        `, [alienEntity.id, alienUser.id]);


        // 6. Create Properties (Buildings)
        console.log('Creating Properties...');
        
        // Property for Main Owner
        await pool.query(`
            INSERT INTO buildings (owner_id, nom, type, adresse, ville, pays, created_at)
            VALUES ($1, 'Immeuble Principal', 'immeuble', 'Rue Principale', 'Cotonou', 'Bénin', NOW())
        `, [ownerEntity.id]);

        // Property for Alien Owner
        await pool.query(`
            INSERT INTO buildings (owner_id, nom, type, adresse, ville, pays, created_at)
            VALUES ($1, 'Immeuble Alien', 'immeuble', 'Rue Inconnue', 'Parakou', 'Bénin', NOW())
        `, [alienEntity.id]);

        console.log('\n🎉 Seeding Completed successfully!');
        console.log('------------------------------------------------');
        console.log('👤 Owner Account: owner@test.com / password123');
        console.log('👤 Manager Account: manager@test.com / password123');
        console.log('👽 Alien Account: alien@test.com / password123');
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

seedData();
