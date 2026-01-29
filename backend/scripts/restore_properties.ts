// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const DB_CONFIG = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    };

console.log('DB Config:', JSON.stringify({...DB_CONFIG, password: '***'}, null, 2));

const pool = new Pool(DB_CONFIG);

async function restoreProperties() {
    console.log('📦 Starting Property Restoration & Distribution...');

    try {
        // 1. Find the latest backup file
        const backupsDir = path.join(__dirname, '../../backups');
        const files = fs.readdirSync(backupsDir)
            .filter(file => file.startsWith('backup_entities_') && file.endsWith('.json'))
            .map(file => path.join(backupsDir, file));
        
        if (files.length === 0) {
            throw new Error('No backup file found!');
        }
        
        // Sort by time descending
        files.sort().reverse();
        const latestBackup = files[0];
        console.log(`📂 Reading backup file: ${path.basename(latestBackup)}`);

        const data = JSON.parse(fs.readFileSync(latestBackup, 'utf-8'));
        const { buildings, lots } = data;

        if (!buildings || buildings.length === 0) {
            console.log('⚠️ No buildings to restore.');
            return;
        }

        console.log(`   Found ${buildings.length} buildings and ${lots.length} lots.`);

        // 2. Get Test Owners IDs
        const ownersRes = await pool.query("SELECT id, email FROM owners WHERE email IN ('owner@test.com', 'alien@test.com')");
        
        const mainOwner = ownersRes.rows.find(o => o.email === 'owner@test.com');
        const alienOwner = ownersRes.rows.find(o => o.email === 'alien@test.com');

        if (!mainOwner || !alienOwner) {
            throw new Error('Test owners not found. Please run seed_test_data.ts first.');
        }

        console.log(`👤 Main Owner ID: ${mainOwner.id}`);
        console.log(`👽 Alien Owner ID: ${alienOwner.id}`);

        // 3. Distribute & Insert Buildings
        const buildingMap = new Map(); // Old ID -> New ID

        console.log('\n🏗️ Restoring Buildings...');
        for (let i = 0; i < buildings.length; i++) {
            const b = buildings[i];
            
            // Distribute: Even -> Main, Odd -> Alien
            const targetOwnerId = (i % 2 === 0) ? mainOwner.id : alienOwner.id;
            const targetOwnerName = (i % 2 === 0) ? 'Main' : 'Alien';

            const res = await pool.query(`
                INSERT INTO buildings (
                    owner_id, nom, type, adresse, ville, pays, 
                    description, nombre_etages, 
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                targetOwnerId,
                b.nom,
                b.type || 'immeuble',
                b.adresse,
                b.ville,
                b.pays || 'Bénin',
                b.description,
                b.nombre_etages || b.nbre_etages || 0,
                b.created_at || new Date()
            ]);

            const newId = res.rows[0].id;
            buildingMap.set(b.id, newId);
            console.log(`   ✅ [${targetOwnerName}] Restored "${b.nom}" (Old ID: ${b.id} -> New ID: ${newId})`);
        }

        // 4. Restore Lots
        console.log('\n🏠 Restoring Lots...');
        let lotsRestored = 0;
        
        for (const lot of lots) {
            const newBuildingId = buildingMap.get(lot.building_id);
            
            if (!newBuildingId) {
                console.warn(`   ⚠️ Skipping lot "${lot.ref_lot}" (Building ID ${lot.building_id} not found in map)`);
                continue;
            }

            // We need to fetch the owner of the new building to ensure consistency
            // (Though strictly speaking, lots usually reference owner via building, but sometimes have direct owner_id column)
            // Let's check the schema logic later, but assuming standard flow:
            // Just for safety, let's get the owner_id from the building we just inserted (or our logic)
            // Actually, we know the mapping.
            
            // Fetch ownerID of the building from DB to be compliant if needed, or just insert.
            // But wait, the lot table might have owner_id or just building_id.
            // Based on previous views, lots table likely has owner_id too for easier querying.
            
            // Let's assume we need to set owner_id same as building's owner_id
            // Find which owner we assigned this building to:
            // We can store it in the map: OldID -> {newId, ownerId}
            
            // Optimization: Query the building's owner_id
             const bRes = await pool.query('SELECT owner_id FROM buildings WHERE id = $1', [newBuildingId]);
             const ownerId = bRes.rows[0].owner_id;

            await pool.query(`
                INSERT INTO lots (
                    building_id, owner_id, ref_lot, type, 
                    description, surface, nb_pieces, loyer_mensuel, 
                    charges_mensuelles, statut, etage, bloc,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                newBuildingId,
                ownerId,
                lot.ref_lot,
                lot.type,
                lot.description,
                lot.surface || 0,
                lot.nb_pieces || lot.nbre_pieces || 0,
                lot.loyer_mensuel || lot.loyer_hc || 0,
                lot.charges_mensuelles || lot.charges || 0,
                'vacant', // Reset status to vacant for testing
                lot.etage,
                lot.bloc,
                lot.created_at || new Date()
            ]);
            lotsRestored++;
        }
        
        console.log(`   ✅ Restored ${lotsRestored} lots.`);

        console.log('\n🎉 Restoration & Distribution Completed!');

    } catch (error) {
        console.error('❌ Restoration failed:', error);
    } finally {
        await pool.end();
    }
}

restoreProperties().then(() => {
    console.log('Script finished.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
