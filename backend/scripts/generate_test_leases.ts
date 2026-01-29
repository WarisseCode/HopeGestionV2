// @ts-nocheck
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

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

async function generateTestData() {
    console.log('🎲 Generating Test Leases...');

    try {
        // 1. Get available lots and tenants grouped by owner
        const lotsRes = await pool.query(`
            SELECT l.id, l.ref_lot, l.loyer_mensuel, l.charges_mensuelles, b.owner_id
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            WHERE l.statut = 'vacant'
            ORDER BY b.owner_id, RANDOM()
        `);

        const tenantsRes = await pool.query(`
            SELECT id, nom, prenoms, owner_id
            FROM tenants
            ORDER BY owner_id, RANDOM()
        `);

        console.log(`   Found ${lotsRes.rows.length} vacant lots`);
        console.log(`   Found ${tenantsRes.rows.length} tenants`);

        // 2. Group by owner
        const lotsByOwner = {};
        const tenantsByOwner = {};

        lotsRes.rows.forEach(lot => {
            if (!lotsByOwner[lot.owner_id]) lotsByOwner[lot.owner_id] = [];
            lotsByOwner[lot.owner_id].push(lot);
        });

        tenantsRes.rows.forEach(tenant => {
            if (!tenantsByOwner[tenant.owner_id]) tenantsByOwner[tenant.owner_id] = [];
            tenantsByOwner[tenant.owner_id].push(tenant);
        });

        // 3. Create Leases
        console.log('\n📄 Creating Leases...');
        let leasesCreated = 0;

        const today = new Date();
        const oneYearLater = new Date(today);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

        for (const ownerId of Object.keys(lotsByOwner)) {
            const ownerLots = lotsByOwner[ownerId] || [];
            const ownerTenants = tenantsByOwner[ownerId] || [];

            const maxLeases = Math.min(ownerLots.length, ownerTenants.length, 10); // Max 10 per owner

            for (let i = 0; i < maxLeases; i++) {
                const lot = ownerLots[i];
                const tenant = ownerTenants[i];

                try {
                    await pool.query(`
                        INSERT INTO leases (
                            tenant_id, lot_id, owner_id,
                            reference_bail, type_contrat,
                            date_debut, date_fin, duree_contrat,
                            loyer_actuel, charges_mensuelles,
                            caution, avance, frequence_paiement,
                            statut, gestionnaire_id,
                            created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
                    `, [
                        tenant.id,
                        lot.id,
                        lot.owner_id,
                        `BAIL-${Date.now()}-${leasesCreated}`,
                        'location',
                        today,
                        oneYearLater,
                        12,
                        lot.loyer_mensuel || 50000,
                        lot.charges_mensuelles || 5000,
                        (lot.loyer_mensuel || 50000) * 2,
                        (lot.loyer_mensuel || 50000) * 1,
                        'mensuel',
                        'actif',
                        null
                    ]);

                    await pool.query(`UPDATE lots SET statut = 'loue' WHERE id = $1`, [lot.id]);

                    console.log(`   ✅ [Owner ${ownerId}] "${tenant.nom} ${tenant.prenoms}" → Lot ${lot.ref_lot}`);
                    leasesCreated++;
                } catch (err) {
                    console.warn(`   ⚠️ Error: ${err.message}`);
                }
            }
        }

        console.log(`\n✅ Created ${leasesCreated} leases`);
        console.log('🎉 Test Data Generation Completed!');

    } catch (error) {
        console.error('❌ Generation failed:', error);
    } finally {
        await pool.end();
    }
}

generateTestData().then(() => {
    console.log('Script finished.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
