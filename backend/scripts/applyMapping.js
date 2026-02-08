const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ 
    connectionString: process.env.PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyMapping() {
    console.log('🔗 APPLICATION DES LIENS PROPRIÉTAIRE-GESTIONNAIRE\n');
    
    try {
        // Lire le fichier de configuration
        const configFile = path.join(__dirname, 'mapping_config.json');
        
        if (!fs.existsSync(configFile)) {
            console.error('❌ Fichier mapping_config.json introuvable!');
            console.log('💡 Exécutez d\'abord: node scripts/createMapping.js');
            process.exit(1);
        }
        
        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        
        console.log('📋 Validation de la configuration...\n');
        
        let validLinks = 0;
        let invalidLinks = 0;
        
        for (const [userId, link] of Object.entries(config.links)) {
            if (link.owner_id === null) {
                console.log(`⚠️  User ${userId}: Aucun owner_id défini - IGNORÉ`);
                invalidLinks++;
            } else {
                validLinks++;
            }
        }
        
        console.log(`\n✅ ${validLinks} lien(s) valide(s)`);
        console.log(`⚠️  ${invalidLinks} lien(s) ignoré(s)\n`);
        
        if (validLinks === 0) {
            console.error('❌ Aucun lien valide à créer!');
            process.exit(1);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('CRÉATION DES LIENS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        let created = 0;
        
        for (const [userId, link] of Object.entries(config.links)) {
            if (link.owner_id !== null) {
                try {
                    await pool.query(`
                        INSERT INTO owner_user (
                            owner_id, user_id, role, is_active, start_date,
                            can_view_finances, can_edit_properties, can_manage_tenants,
                            can_manage_contracts, can_validate_payments, can_manage_users, can_delete_data
                        )
                        VALUES ($1, $2, 'manager', TRUE, CURRENT_DATE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
                    `, [link.owner_id, userId]);
                    
                    console.log(`✅ User ${userId} → Owner ${link.owner_id} (${link.reason})`);
                    created++;
                } catch (err) {
                    if (err.code === '23505') {
                        console.log(`⚠️  User ${userId} → Lien déjà existant`);
                    } else {
                        console.error(`❌ User ${userId} → Erreur: ${err.message}`);
                    }
                }
            }
        }
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🎉 ${created} lien(s) créé(s) avec succès!`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        
        // Vérification finale
        const check = await pool.query(`
            SELECT COUNT(*) FROM users u 
            LEFT JOIN owner_user ou ON u.id = ou.user_id 
            WHERE ou.user_id IS NULL 
            AND u.role IN ('gestionnaire', 'proprietaire', 'manager')
            AND u.statut = 'actif'
        `);
        
        const remaining = parseInt(check.rows[0].count);
        
        if (remaining === 0) {
            console.log('✅ SUCCÈS COMPLET! Tous les gestionnaires sont liés.');
            console.log('💡 Testez maintenant les pages Biens et Dashboard.');
        } else {
            console.log(`⚠️  Il reste ${remaining} gestionnaire(s) sans lien.`);
            console.log('💡 Modifiez mapping_config.json et relancez ce script.');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

applyMapping();
