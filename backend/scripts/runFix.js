const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Erreur: PROD_DATABASE_URL non définie');
    process.exit(1);
}

// Configuration avec SSL pour Render
const pool = new Pool({ 
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runFix() {
    console.log('🔧 Application des corrections...\n');
    
    try {
        // Étape 1: Créer un propriétaire principal si nécessaire
        console.log('1️⃣ Vérification/Création du propriétaire principal...');
        
        const existingOwner = await pool.query(
            `SELECT id FROM owners WHERE email = 'admin@hopegestion.com' LIMIT 1`
        );
        
        let ownerId;
        if (existingOwner.rows.length > 0) {
            ownerId = existingOwner.rows[0].id;
            console.log(`   ✅ Propriétaire existant trouvé (ID: ${ownerId})`);
        } else {
            const newOwner = await pool.query(`
                INSERT INTO owners (name, email, phone, type, is_active, created_at)
                VALUES ('Hope Gestion - Propriétaire Principal', 'admin@hopegestion.com', '00000000', 'company', TRUE, NOW())
                RETURNING id
            `);
            ownerId = newOwner.rows[0].id;
            console.log(`   ✅ Nouveau propriétaire créé (ID: ${ownerId})`);
        }
        
        // Étape 2: Lier les utilisateurs sans liens
        console.log('\n2️⃣ Création des liens owner_user...');
        
        const result = await pool.query(`
            INSERT INTO owner_user (
                owner_id, 
                user_id, 
                role, 
                is_active, 
                start_date,
                can_view_finances,
                can_edit_properties,
                can_manage_tenants,
                can_manage_contracts,
                can_validate_payments,
                can_manage_users,
                can_delete_data
            )
            SELECT 
                $1 as owner_id,
                u.id as user_id,
                CASE 
                    WHEN u.role = 'proprietaire' THEN 'owner'
                    ELSE 'manager'
                END as role,
                TRUE as is_active,
                CURRENT_DATE as start_date,
                TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
            FROM users u
            LEFT JOIN owner_user ou ON u.id = ou.user_id
            WHERE ou.user_id IS NULL
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
            RETURNING user_id
        `, [ownerId]);
        
        console.log(`   ✅ ${result.rows.length} liens créés`);
        result.rows.forEach(row => {
            console.log(`      - User ID: ${row.user_id}`);
        });
        
        // Étape 3: Vérification
        console.log('\n3️⃣ Vérification finale...');
        const check = await pool.query(`
            SELECT COUNT(*) as remaining
            FROM users u 
            LEFT JOIN owner_user ou ON u.id = ou.user_id 
            WHERE ou.user_id IS NULL 
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
        `);
        
        if (parseInt(check.rows[0].remaining) === 0) {
            console.log('   ✅ Tous les utilisateurs sont maintenant liés !');
            console.log('\n🎉 Correction réussie! Les erreurs devraient être résolues.');
            console.log('💡 Testez maintenant les pages Biens et Dashboard sur votre plateforme.');
        } else {
            console.log(`   ⚠️  Il reste ${check.rows[0].remaining} utilisateur(s) sans lien`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

runFix();
