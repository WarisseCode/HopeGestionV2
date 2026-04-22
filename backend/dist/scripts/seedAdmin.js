"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = seedSuperAdmin;
// backend/scripts/seedAdmin.ts
const database_1 = __importDefault(require("../db/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
async function seedSuperAdmin() {
    const defaultEmail = process.env.ADMIN_EMAIL || 'superadmin@hope.com';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'HopeAdmin2026!';
    const defaultName = process.env.ADMIN_NAME || 'Super Admin';
    // Force reset flag - set to true to reset existing admin password
    const FORCE_RESET = process.env.FORCE_ADMIN_RESET === 'true';
    try {
        // Check if any admin exists
        const adminCheck = await database_1.default.query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
        if (adminCheck.rows.length > 0) {
            const existingAdmin = adminCheck.rows[0];
            if (FORCE_RESET) {
                // Force reset the password
                const hashedPassword = await bcrypt_1.default.hash(defaultPassword, SALT_ROUNDS);
                await database_1.default.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, existingAdmin.id]);
                console.log('╔═══════════════════════════════════════════════════════════════╗');
                console.log('║  🔄 MOT DE PASSE ADMIN RÉINITIALISÉ                           ║');
                console.log('╠═══════════════════════════════════════════════════════════════╣');
                console.log(`║  Email:    ${existingAdmin.email.padEnd(48)}║`);
                console.log(`║  Password: ${defaultPassword.padEnd(48)}║`);
                console.log('╠═══════════════════════════════════════════════════════════════╣');
                console.log('║  ⚠️  CHANGEZ CE MOT DE PASSE APRÈS CONNEXION!                  ║');
                console.log('║  ⚠️  DÉSACTIVEZ FORCE_ADMIN_RESET APRÈS USAGE!                 ║');
                console.log('╚═══════════════════════════════════════════════════════════════╝');
            }
            else {
                console.log(`[SEED] Super Admin already exists (${existingAdmin.email}). Skipping seed.`);
                console.log('[SEED] To reset password, set FORCE_ADMIN_RESET=true in environment.');
            }
            return;
        }
        // Check if email is already taken (by non-admin user)
        const emailCheck = await database_1.default.query("SELECT id FROM users WHERE email = $1", [defaultEmail]);
        if (emailCheck.rows.length > 0) {
            console.log(`[SEED] Email ${defaultEmail} already exists. Promoting to admin...`);
            const hashedPassword = await bcrypt_1.default.hash(defaultPassword, SALT_ROUNDS);
            await database_1.default.query("UPDATE users SET role = 'admin', user_type = 'admin', password_hash = $1 WHERE email = $2", [hashedPassword, defaultEmail]);
            console.log(`[SEED] User ${defaultEmail} promoted to Super Admin with new password.`);
            return;
        }
        // Create new Super Admin
        const hashedPassword = await bcrypt_1.default.hash(defaultPassword, SALT_ROUNDS);
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, nom, telephone, role, user_type, statut, is_verified, created_at)
             VALUES ($1, $2, $3, $4, 'admin', 'admin', 'actif', true, NOW())
             RETURNING id, email`, [defaultEmail, hashedPassword, defaultName, process.env.ADMIN_PHONE || '+22900000000']);
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  🚀 SUPER ADMIN CRÉÉ AUTOMATIQUEMENT                          ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║  Email:    ${defaultEmail.padEnd(48)}║`);
        console.log(`║  Password: ${defaultPassword.padEnd(48)}║`);
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log('║  ⚠️  CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT APRÈS CONNEXION!    ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
    }
    catch (error) {
        console.error('[SEED] Error seeding Super Admin:', error.message);
        // Don't crash the server if seed fails
    }
}
