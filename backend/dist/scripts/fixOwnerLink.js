"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
async function fixOwnerLinks() {
    try {
        console.log('🔗 Démarrage du script de liaison Utilisateur-Propriétaire...');
        // 1. Récupérer le premier propriétaire (Default)
        const ownerRes = await index_1.pool.query('SELECT id, name FROM owners LIMIT 1');
        if (ownerRes.rows.length === 0) {
            console.error('❌ Aucun propriétaire trouvé. Veuillez exécuter la migration ou en créer un.');
            process.exit(1);
        }
        const ownerId = ownerRes.rows[0].id;
        console.log(`✅ Propriétaire par défaut: ${ownerRes.rows[0].name} (ID: ${ownerId})`);
        // 2. Récupérer tous les utilisateurs
        const usersRes = await index_1.pool.query('SELECT id, nom, email FROM users');
        console.log(`👥 ${usersRes.rows.length} utilisateurs trouvés.`);
        // 3. Lier chaque utilisateur au propriétaire par défaut (si pas déjà lié)
        for (const user of usersRes.rows) {
            await index_1.pool.query(`
                INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active, can_view_finances, can_manage_tenants)
                VALUES ($1, $2, 'manager', CURRENT_DATE, TRUE, TRUE, TRUE)
                ON CONFLICT (owner_id, user_id) DO UPDATE SET 
                    is_active = TRUE,
                    can_view_finances = TRUE,
                    can_manage_tenants = TRUE
            `, [ownerId, user.id]);
            console.log(`   -> Utilisateur ${user.nom} (${user.email}) lié à l'ID Propriétaire ${ownerId}`);
        }
        console.log('✨ Tous les utilisateurs ont été liés avec succès !');
        console.log('   Les menus déroulants Locataires devraient maintenant être remplis.');
    }
    catch (error) {
        console.error('❌ Erreur:', error.message);
    }
    finally {
        // Force exit because pool keeps connection open
        setTimeout(() => process.exit(0), 1000);
    }
}
fixOwnerLinks();
