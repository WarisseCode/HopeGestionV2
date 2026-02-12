// backend/scripts/debugPaymentLink.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Charger .env
const result = dotenv.config();
if (result.error) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const dbConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pool = new Pool(dbConfig);

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔍 Diagnostic des échéances de paiement...');

        const tenantId = 79; // L'ID que nous avons vu dans les logs
        console.log(`👤 Locataire connecté: ID ${tenantId}`);

        // 1. Voir les baux de ce locataire
        const leasesRes = await client.query(`
            SELECT l.id, l.lot_id, l.statut, l.loyer_actuel
            FROM leases l
            WHERE l.tenant_id = $1
        `, [tenantId]);

        console.log(`📜 Baux trouvés pour le locataire ${tenantId}: ${leasesRes.rows.length}`);
        leasesRes.rows.forEach(l => console.log(`   - Bail ID: ${l.id}, Statut: ${l.statut}, Loyer: ${l.loyer_actuel}`));

        if (leasesRes.rows.length === 0) {
            console.error('❌ Ce locataire n\'a aucun bail !');
            console.log('✨ Création d\'un bail et d\'une échéance pour ce locataire...');
            
            // 1. Trouver un lot disponible
            const lotRes = await client.query('SELECT id, loyer_mensuel FROM lots LIMIT 1');
            let lotId, loyer;
            
            if (lotRes.rows.length > 0) {
                lotId = lotRes.rows[0].id;
                loyer = lotRes.rows[0].loyer_mensuel;
            } else {
                console.error('❌ Aucun lot trouvé pour créer un bail.');
                return;
            }

            // 2. Créer le bail
            const startDate = new Date();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const leaseResult = await client.query(`
                INSERT INTO leases (lot_id, tenant_id, date_debut, date_fin, loyer_actuel, statut)
                VALUES ($1, $2, $3, $4, $5, 'actif')
                RETURNING id
            `, [lotId, tenantId, startDate, endDate, loyer]);
            
            const newLeaseId = leaseResult.rows[0].id;
            console.log(`✅ Bail créé: ID ${newLeaseId}`);

            // 3. Créer l'échéance
            const dueDate = new Date();
            const description = `Loyer Test Locataire 79`;
            
            await client.query(`
                INSERT INTO payment_schedules (lease_id, total_amount, amount_paid, due_date, status, description)
                VALUES ($1, $2, 0, $3, 'pending', $4)
            `, [newLeaseId, loyer, dueDate, description]);
            
            console.log('✅ Échéance créée pour le locataire 79 !');
            return;
        }

        const activeLease = leasesRes.rows.find(l => l.statut === 'actif');
        if (!activeLease) {
            console.error('❌ Ce locataire n\'a aucun bail ACTIF !');
        } else {
            console.log(`✅ Bail actif trouvé: ID ${activeLease.id}`);
            
            // 2. Voir les échéances pour ce bail
            const schedulesRes = await client.query(`
                SELECT id, due_date, status, total_amount
                FROM payment_schedules
                WHERE lease_id = $1 AND status IN ('pending', 'overdue')
                ORDER BY due_date DESC
            `, [activeLease.id]);

            console.log(`💰 Échéances en attente pour le bail ${activeLease.id}: ${schedulesRes.rows.length}`);
            schedulesRes.rows.forEach(s => console.log(`   - Schedule ID: ${s.id}, Date: ${s.due_date}, Montant: ${s.total_amount}`));

            if (schedulesRes.rows.length === 0) {
                console.log('➕ Création d\'une échéance pour ce locataire spécifique...');
                const dueDate = new Date();
                const description = `Loyer Test Locataire 79`;
                
                await client.query(`
                    INSERT INTO payment_schedules (lease_id, total_amount, amount_paid, due_date, status, description)
                    VALUES ($1, $2, 0, $3, 'pending', $4)
                `, [activeLease.id, activeLease.loyer_actuel, dueDate, description]);
                
                console.log('✅ Échéance créée !');
            }
        }

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
