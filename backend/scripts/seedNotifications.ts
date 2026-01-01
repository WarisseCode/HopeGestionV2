
// backend/scripts/seedNotifications.ts
// Script pour injecter des notifications de démonstration pour TOUS les utilisateurs

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

const sampleNotifications = [
    { type: 'warning', title: '⚠️ Loyer en retard', message: 'Le locataire KOFFI Jean (Lot A01) a un retard de paiement de 5 jours.' },
    { type: 'success', title: '✅ Paiement reçu', message: 'Paiement de 150 000 FCFA reçu pour le lot B02 via Mobile Money.' },
    { type: 'info', title: '📅 Contrat expire bientôt', message: 'Le contrat du locataire AMOUSSOU Marie expire dans 30 jours.' },
    { type: 'error', title: '🚨 Intervention urgente', message: 'Fuite d\'eau signalée dans l\'appartement C03 - Action requise.' },
    { type: 'info', title: '🏠 Nouveau locataire', message: 'MENSAH Pierre a été ajouté comme locataire pour le lot D01.' },
    { type: 'success', title: '📊 Rapport mensuel', message: 'Le rapport financier de décembre 2025 est disponible.' },
];

async function seedNotificationsForAllUsers() {
    try {
        // Get ALL users
        const usersRes = await pool.query('SELECT id, email FROM users');
        
        if (usersRes.rows.length === 0) {
            console.error('❌ Aucun utilisateur trouvé.');
            return;
        }
        
        console.log(`👥 ${usersRes.rows.length} utilisateurs trouvés.\n`);
        
        for (const user of usersRes.rows) {
            console.log(`📧 ${user.email} (ID: ${user.id})`);
            
            for (const notif of sampleNotifications) {
                await pool.query(
                    'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
                    [user.id, notif.type, notif.title, notif.message]
                );
            }
            console.log(`   ✅ ${sampleNotifications.length} notifications ajoutées`);
        }
        
        console.log(`\n🎉 Terminé ! Chaque utilisateur a maintenant ${sampleNotifications.length} notifications.`);
        console.log('👉 Allez sur http://localhost:5173/dashboard/alertes → Onglet "Notifications"');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

seedNotificationsForAllUsers();
