"use strict";
// backend/scripts/seedNotifications.ts
// Script pour injecter des notifications de démonstration pour TOUS les utilisateurs
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
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
                await pool.query('INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)', [user.id, notif.type, notif.title, notif.message]);
            }
            console.log(`   ✅ ${sampleNotifications.length} notifications ajoutées`);
        }
        console.log(`\n🎉 Terminé ! Chaque utilisateur a maintenant ${sampleNotifications.length} notifications.`);
        console.log('👉 Allez sur http://localhost:5173/dashboard/alertes → Onglet "Notifications"');
    }
    catch (error) {
        console.error('❌ Erreur:', error);
    }
    finally {
        await pool.end();
    }
}
seedNotificationsForAllUsers();
//# sourceMappingURL=seedNotifications.js.map