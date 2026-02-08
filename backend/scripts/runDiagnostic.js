const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

// IMPORTANT: Mettre à jour DATABASE_URL dans .env avec l'URL de production
const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Erreur: PROD_DATABASE_URL non définie dans .env');
    console.log('💡 Ajoutez dans backend/.env:');
    console.log('PROD_DATABASE_URL=postgresql://hope_user:PASSWORD@HOST.render.com/hopegestion');
    process.exit(1);
}

// Configuration avec SSL pour Render
const pool = new Pool({ 
    connectionString,
    ssl: {
        rejectUnauthorized: false  // Requis pour Render.com
    }
});

// Fichier de sortie
const outputFile = path.join(__dirname, 'diagnostic_results.txt');
let output = '';

function log(message) {
    console.log(message);
    output += message + '\n';
}

async function runDiagnostic() {
    log('🔍 Connexion à la base de données de production...\n');
    
    try {
        // 1. Vérifier owner_user
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('📊 LIENS OWNER_USER EXISTANTS');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const ownerUserRes = await pool.query('SELECT * FROM owner_user');
        output += JSON.stringify(ownerUserRes.rows, null, 2) + '\n';
        console.table(ownerUserRes.rows);
        
        // 2. Compter les liens actifs
        const countRes = await pool.query('SELECT COUNT(*) FROM owner_user WHERE is_active = TRUE');
        log(`\n✅ Total liens actifs: ${countRes.rows[0].count}\n`);
        
        // 3. Utilisateurs sans liens
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('⚠️  UTILISATEURS SANS LIENS');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const usersWithoutLinksRes = await pool.query(`
            SELECT u.id, u.nom, u.email, u.role, u.statut
            FROM users u 
            LEFT JOIN owner_user ou ON u.id = ou.user_id 
            WHERE ou.user_id IS NULL 
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
            ORDER BY u.id
        `);
        output += JSON.stringify(usersWithoutLinksRes.rows, null, 2) + '\n';
        console.table(usersWithoutLinksRes.rows);
        
        // 4. Propriétaires disponibles
        log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('🏢 PROPRIÉTAIRES DISPONIBLES');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const ownersRes = await pool.query('SELECT id, name, email, type, is_active FROM owners ORDER BY id');
        output += JSON.stringify(ownersRes.rows, null, 2) + '\n';
        console.table(ownersRes.rows);
        
        // 5. Résumé global
        log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log('📈 RÉSUMÉ GLOBAL');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const summaryRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role IN ('gestionnaire', 'proprietaire', 'manager') AND statut = 'actif') as total_users_non_admin,
                (SELECT COUNT(*) FROM owners WHERE is_active = TRUE) as total_owners,
                (SELECT COUNT(*) FROM owner_user WHERE is_active = TRUE) as total_links,
                (SELECT COUNT(*) FROM users u LEFT JOIN owner_user ou ON u.id = ou.user_id WHERE ou.user_id IS NULL AND u.role IN ('gestionnaire', 'proprietaire', 'manager') AND u.statut = 'actif') as users_sans_lien
        `);
        output += JSON.stringify(summaryRes.rows, null, 2) + '\n';
        console.table(summaryRes.rows);
        
        log('\n✅ Diagnostic terminé!');
        
        if (parseInt(summaryRes.rows[0].users_sans_lien) > 0) {
            log('\n⚠️  ACTION REQUISE: Exécutez le script de correction');
            log('   node backend/scripts/runFix.js');
        } else {
            log('\n✅ Aucune correction nécessaire');
        }
        
        // Sauvegarder dans un fichier
        fs.writeFileSync(outputFile, output);
        log(`\n💾 Résultats sauvegardés dans: ${outputFile}`);
        
    } catch (error) {
        log(`❌ Erreur lors du diagnostic: ${error.message}`);
        fs.writeFileSync(outputFile, output + '\nERREUR: ' + error.stack);
    } finally {
        await pool.end();
    }
}

runDiagnostic();
