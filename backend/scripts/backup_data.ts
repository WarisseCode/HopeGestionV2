
import pool from '../db/database';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function backupData() {
    try {
        console.log('📦 Starting Data Backup...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `backup_entities_${timestamp}.json`);
        
        // 1. Users
        const users = await pool.query('SELECT * FROM users ORDER BY id');
        console.log(`✅ Users found: ${users.rows.length}`);

        // 2. Owners
        const owners = await pool.query('SELECT * FROM owners ORDER BY id');
        console.log(`✅ Owners found: ${owners.rows.length}`);

        // 3. Owner-User Assignments
        const ownerUsers = await pool.query('SELECT * FROM owner_user');
        console.log(`✅ Owner-User links found: ${ownerUsers.rows.length}`);

        // 4. Tenants (Locataires)
        const tenants = await pool.query('SELECT * FROM tenants ORDER BY id');
        console.log(`✅ Tenants found: ${tenants.rows.length}`);

         // 5. Buildings & Lots (pour info, même si on va les supprimer)
        const buildings = await pool.query('SELECT * FROM buildings');
        const lots = await pool.query('SELECT * FROM lots');

        const backupData = {
            timestamp,
            users: users.rows,
            owners: owners.rows,
            owner_user_links: ownerUsers.rows,
            tenants: tenants.rows,
            buildings: buildings.rows,
            lots: lots.rows
        };

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`\n🎉 Backup saved successfully to: ${backupFile}`);
        console.log(`Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
    } finally {
        await pool.end();
    }
}

backupData();
