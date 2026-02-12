const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try loading .env from current dir and parent dir
const result = dotenv.config();

if (result.error) {
    console.log('⚠️ .env not found in current directory, trying parent...');
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

console.log('🔧 DB Config Check:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '******' : 'UNDEFINED');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');

const dbConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD, // Ensure this is not undefined
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

// Validation
if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    console.error('❌ DB_PASSWORD is missing in .env');
    process.exit(1);
}

const pool = new Pool(dbConfig);

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔍 Recherche d\'un bail actif...');
        
        // 1. Chercher un bail actif (priorité ID 1)
        const leaseRes = await client.query(`
            SELECT l.id, l.tenant_id, t.nom, t.prenoms, l.loyer_actuel, t.email
            FROM leases l
            JOIN tenants t ON l.tenant_id = t.id
            WHERE l.statut = 'actif'
            ORDER BY l.id = 1 DESC, l.id ASC
            LIMIT 1
        `);

        if (leaseRes.rows.length === 0) {
            console.error('❌ Aucun bail actif trouvé ! Veuillez créer un bail d\'abord.');
            return;
        }

        const lease = leaseRes.rows[0];
        console.log(`✅ Bail trouvé: ID ${lease.id} (Locataire: ${lease.prenoms} ${lease.nom})`);

        // 2. Vérifier s'il y a déjà une échéance en attente
        const pendingRes = await client.query(`
            SELECT id FROM payment_schedules 
            WHERE lease_id = $1 AND status IN ('pending', 'overdue')
        `, [lease.id]);

        if (pendingRes.rows.length > 0) {
            console.log('ℹ️ Ce bail a déjà des échéances en attente.');
        } else {
            console.log('➕ Création d\'une échéance de test...');
            const dueDate = new Date();
            const description = `Loyer Test ${dueDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
            
            await client.query(`
                INSERT INTO payment_schedules (lease_id, total_amount, amount_paid, due_date, status, description)
                VALUES ($1, $2, 0, $3, 'pending', $4)
            `, [lease.id, lease.loyer_actuel, dueDate, description]);
            
            console.log('✅ Échéance de test créée avec succès !');
        }

        console.log('\n📝 Instructions pour le test :');
        console.log('1. Connectez-vous avec le compte locataire associé (Email: ' + (lease.email || 'inconnu') + ')');
        console.log('2. Allez sur /dashboard/paiements-loyer');
        console.log('3. Vous devriez voir un loyer à payer de ' + lease.loyer_actuel + ' FCFA');

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
