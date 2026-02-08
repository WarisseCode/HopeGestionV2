const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ 
    connectionString: process.env.PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function showDetailedInfo() {
    console.log('📋 ANALYSE COMPLÈTE DE LA STRUCTURE\n');
    
    try {
        // 1. Propriétaires existants
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏢 PROPRIÉTAIRES EXISTANTS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const ownersRes = await pool.query(`
            SELECT 
                id, 
                name, 
                email, 
                type,
                (SELECT COUNT(*) FROM buildings WHERE owner_id = owners.id) as nb_buildings,
                (SELECT COUNT(*) FROM lots WHERE owner_id = owners.id) as nb_lots
            FROM owners 
            WHERE is_active = TRUE
            ORDER BY id
        `);
        
        if (ownersRes.rows.length === 0) {
            console.log('⚠️  AUCUN PROPRIÉTAIRE TROUVÉ\n');
            console.log('💡 Solution recommandée: Créer 1 propriétaire par gestionnaire');
        } else {
            console.table(ownersRes.rows);
            console.log(`\nTotal: ${ownersRes.rows.length} propriétaire(s)\n`);
        }
        
        // 2. Utilisateurs sans liens
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👥 GESTIONNAIRES SANS LIENS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const usersRes = await pool.query(`
            SELECT 
                u.id, 
                u.nom, 
                u.email, 
                u.role,
                u.created_at::date as date_creation
            FROM users u 
            LEFT JOIN owner_user ou ON u.id = ou.user_id 
            WHERE ou.user_id IS NULL 
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
            ORDER BY u.id
        `);
        console.table(usersRes.rows);
        
        // 3. Proposer des options
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 OPTIONS DE CORRECTION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (ownersRes.rows.length === 0) {
            console.log('Option A (RECOMMANDÉE) : Créer 1 propriétaire par gestionnaire');
            console.log('   → Chaque gestionnaire aura son propre espace isolé');
            console.log('   → Commande: node scripts/createOwnersForManagers.js\n');
            
            console.log('Option B : Créer 1 seul propriétaire pour tous');
            console.log('   ⚠️  ATTENTION: Tous les gestionnaires verront les biens des autres !');
            console.log('   → Commande: node scripts/createSingleOwner.js\n');
        } else if (ownersRes.rows.length === 1) {
            console.log('Option A : Lier tous les gestionnaires au propriétaire existant');
            console.log(`   → Propriétaire: ${ownersRes.rows[0].name} (ID: ${ownersRes.rows[0].id})`);
            console.log(`   ⚠️  Les ${usersRes.rows.length} gestionnaires verront les mêmes données`);
            console.log('   → Commande: node scripts/linkToOwner.js OWNER_ID\n');
            
            console.log('Option B : Créer des propriétaires supplémentaires');
            console.log('   → Meilleure isolation des données');
            console.log('   → Commande: node scripts/createOwnersForManagers.js\n');
        } else {
            console.log('Option A : Liaison manuelle (RECOMMANDÉE)');
            console.log('   → Vous décidez quel gestionnaire va avec quel propriétaire');
            console.log('   → Commande: node scripts/manualLink.js\n');
            
            console.log('Option B : Créer de nouveaux propriétaires pour certains gestionnaires');
            console.log('   → Commande: node scripts/createOwnersForManagers.js\n');
        }
        
        console.log('\n💡 Besoin d\'aide pour choisir ?');
        console.log('   Répondez à ces questions :');
        console.log('   1. Ces gestionnaires doivent-ils voir les biens des autres ?');
        console.log('   2. Travaillent-ils pour la même agence ou séparément ?');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

showDetailedInfo();
