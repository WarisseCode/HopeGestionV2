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

const pool = new Pool(DB_CONFIG);

async function restoreTenants() {
    console.log('📦 Starting Tenants Restoration & Distribution...');

    try {
        // 1. Find the latest backup file
        const backupsDir = path.join(__dirname, '../../backups');
        const files = fs.readdirSync(backupsDir)
            .filter(file => file.startsWith('backup_entities_') && file.endsWith('.json'))
            .map(file => path.join(backupsDir, file));
        
        if (files.length === 0) {
            throw new Error('No backup file found!');
        }
        
        files.sort().reverse();
        const latestBackup = files[0];
        console.log(`📂 Reading backup file: ${path.basename(latestBackup)}`);

        const data = JSON.parse(fs.readFileSync(latestBackup, 'utf-8'));
        const { tenants } = data;

        if (!tenants || tenants.length === 0) {
            console.log('⚠️ No tenants to restore.');
            return;
        }

        console.log(`   Found ${tenants.length} tenants.`);

        // 2. Get Test Owners IDs
        const ownersRes = await pool.query("SELECT id, email FROM owners WHERE email IN ('owner@test.com', 'alien@test.com')");
        
        const mainOwner = ownersRes.rows.find(o => o.email === 'owner@test.com');
        const alienOwner = ownersRes.rows.find(o => o.email === 'alien@test.com');

        if (!mainOwner || !alienOwner) {
            throw new Error('Test owners not found. Please run seed_test_data.ts first.');
        }

        console.log(`👤 Main Owner ID: ${mainOwner.id}`);
        console.log(`👽 Alien Owner ID: ${alienOwner.id}`);

        // 3. Distribute & Insert Tenants
        console.log('\n👥 Restoring Tenants...');
        let tenantsRestored = 0;

        for (let i = 0; i < tenants.length; i++) {
            const t = tenants[i];
            
            // Distribute: Even -> Main, Odd -> Alien
            const targetOwnerId = (i % 2 === 0) ? mainOwner.id : alienOwner.id;
            const targetOwnerName = (i % 2 === 0) ? 'Main' : 'Alien';

            try {
                await pool.query(`
                    INSERT INTO tenants (
                        owner_id, nom, prenoms, email, telephone_principal, 
                        telephone_secondaire, nationalite, type_piece, numero_piece,
                        type, statut, mode_paiement_preferentiel,
                        adresse_actuelle, date_expiration_piece,
                        caution, avance, paiement_echelonne,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                `, [
                    targetOwnerId,
                    t.nom,
                    t.prenoms || t.prenom || '',
                    t.email,
                    t.telephone_principal || t.telephone,
                    t.telephone_secondaire || null,
                    t.nationalite || 'Béninoise',
                    t.type_piece || t.piece_identite_type || 'CNI',
                    t.numero_piece || t.piece_identite_numero || '',
                    'Locataire',
                    'Actif',
                    t.mode_paiement_preferentiel || 'Espèces',
                    t.adresse_actuelle || t.adresse || null,
                    t.date_expiration_piece || null,
                    t.caution || 0,
                    t.avance || 0,
                    t.paiement_echelonne || false,
                    t.created_at || new Date()
                ]);

                console.log(`   ✅ [${targetOwnerName}] Restored "${t.nom} ${t.prenom}"`);
                tenantsRestored++;
            } catch (err) {
                console.warn(`   ⚠️ Skipping tenant "${t.nom} ${t.prenom}": ${err.message}`);
            }
        }
        
        console.log(`   ✅ Restored ${tenantsRestored} tenants.`);
        console.log('\n🎉 Tenants Restoration & Distribution Completed!');

    } catch (error) {
        console.error('❌ Restoration failed:', error);
    } finally {
        await pool.end();
    }
}

restoreTenants().then(() => {
    console.log('Script finished.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
