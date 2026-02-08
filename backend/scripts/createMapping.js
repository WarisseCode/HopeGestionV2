const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ 
    connectionString: process.env.PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createMappingGuide() {
    console.log('📊 GUIDE DE CORRESPONDANCE PROPRIÉTAIRE-GESTIONNAIRE\n');
    
    try {
        // Récupérer les propriétaires
        const ownersRes = await pool.query(`
            SELECT id, name, email, type FROM owners WHERE is_active = TRUE ORDER BY id
        `);
        
        // Récupérer les gestionnaires sans liens
        const managersRes = await pool.query(`
            SELECT u.id, u.nom, u.email, u.role
            FROM users u 
            LEFT JOIN owner_user ou ON u.id = ou.user_id 
            WHERE ou.user_id IS NULL 
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
            ORDER BY u.id
        `);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('PROPRIÉTAIRES DISPONIBLES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        ownersRes.rows.forEach(owner => {
            console.log(`[${owner.id}] ${owner.name} (${owner.email})`);
        });
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('GESTIONNAIRES À LIER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        managersRes.rows.forEach(manager => {
            console.log(`User ID ${manager.id}: ${manager.nom} (${manager.email}) - ${manager.role}`);
        });
        
        // Créer un fichier de configuration
        const config = {
            instructions: "Modifiez ce fichier pour créer les liens. Format: user_id: owner_id",
            owners: ownersRes.rows.map(o => ({ id: o.id, name: o.name, email: o.email })),
            managers: managersRes.rows.map(m => ({ id: m.id, name: m.nom, email: m.email, role: m.role })),
            links: {}
        };
        
        // Suggérer des liens automatiques basés sur les emails
        managersRes.rows.forEach(manager => {
            const matchingOwner = ownersRes.rows.find(owner => 
                owner.email.toLowerCase() === manager.email.toLowerCase()
            );
            
            if (matchingOwner) {
                config.links[manager.id] = {
                    owner_id: matchingOwner.id,
                    confidence: "high",
                    reason: "Email match",
                    owner_name: matchingOwner.name
                };
            } else {
                config.links[manager.id] = {
                    owner_id: null,
                    confidence: "manual",
                    reason: "Aucune correspondance automatique - À définir manuellement"
                };
            }
        });
        
        const outputFile = path.join(__dirname, 'mapping_config.json');
        fs.writeFileSync(outputFile, JSON.stringify(config, null, 2));
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('CORRESPONDANCES SUGGÉRÉES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        Object.entries(config.links).forEach(([userId, link]) => {
            const manager = managersRes.rows.find(m => m.id == userId);
            if (link.owner_id) {
                console.log(`✅ User ${userId} (${manager.nom}) → Owner ${link.owner_id} (${link.owner_name})`);
                console.log(`   Raison: ${link.reason}\n`);
            } else {
                console.log(`⚠️  User ${userId} (${manager.nom}) → AUCUN LIEN AUTO`);
                console.log(`   ${link.reason}\n`);
            }
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('PROCHAINES ÉTAPES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('1. Vérifiez le fichier: ' + outputFile);
        console.log('2. Modifiez les owner_id si nécessaire');
        console.log('3. Exécutez: node scripts/applyMapping.js');
        console.log('\n💡 Les liens basés sur les emails sont déjà suggérés !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

createMappingGuide();
