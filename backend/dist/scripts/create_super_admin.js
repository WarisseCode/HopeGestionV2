#!/usr/bin/env ts-node
"use strict";
/**
 * create_super_admin.ts
 *
 * Script CLI sécurisé pour créer le Super Admin initial de la plateforme.
 * Usage: npx ts-node scripts/create_super_admin.ts --email=admin@example.com --password=SecureP@ss123
 *
 * Ce script ne doit être exécuté qu'une seule fois lors du déploiement initial.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../db/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const readline = __importStar(require("readline"));
const SALT_ROUNDS = 10;
async function prompt(question, hidden = false) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--email=')) {
            args.email = arg.split('=')[1] || '';
        }
        if (arg.startsWith('--password=')) {
            args.password = arg.split('=')[1] || '';
        }
        if (arg.startsWith('--nom=')) {
            args.nom = arg.split('=')[1] || '';
        }
    });
    return args;
}
async function checkExistingAdmin() {
    const result = await database_1.default.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    return parseInt(result.rows[0].count) > 0;
}
async function createSuperAdmin(data) {
    try {
        // Check if admin already exists
        const existingAdmins = await checkExistingAdmin();
        if (existingAdmins) {
            console.log('\n⚠️  ATTENTION: Un Super Admin existe déjà dans la base de données.');
            const confirm = await prompt('Voulez-vous quand même créer un nouvel admin ? (oui/non): ');
            if (confirm.toLowerCase() !== 'oui') {
                console.log('Opération annulée.');
                process.exit(0);
            }
        }
        // Check if email already exists
        const emailCheck = await database_1.default.query("SELECT id FROM users WHERE email = $1", [data.email]);
        if (emailCheck.rows.length > 0) {
            console.error(`\n❌ Erreur: L'email ${data.email} est déjà utilisé.`);
            process.exit(1);
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(data.password, SALT_ROUNDS);
        // Create admin user
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, nom, role, user_type, statut, created_at)
             VALUES ($1, $2, $3, 'admin', 'admin', 'actif', NOW())
             RETURNING id, email, nom, role`, [data.email, hashedPassword, data.nom]);
        console.log('\n✅ Super Admin créé avec succès !');
        console.log('───────────────────────────────');
        console.log(`   ID:    ${result.rows[0].id}`);
        console.log(`   Email: ${result.rows[0].email}`);
        console.log(`   Nom:   ${result.rows[0].nom}`);
        console.log(`   Rôle:  ${result.rows[0].role}`);
        console.log('───────────────────────────────');
        console.log('\n⚠️  Conservez ces informations en lieu sûr.');
        console.log('   Vous pouvez maintenant vous connecter à /admin');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Erreur lors de la création:', error.message);
        process.exit(1);
    }
}
async function main() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   CRÉATION DU SUPER ADMIN HOPEGESTION  ║');
    console.log('╚════════════════════════════════════════╝\n');
    const args = parseArgs();
    // Get email
    let email = args.email;
    if (!email) {
        email = await prompt('📧 Email du Super Admin: ');
    }
    if (!email || !email.includes('@')) {
        console.error('❌ Email invalide.');
        process.exit(1);
    }
    // Get password
    let password = args.password;
    if (!password) {
        password = await prompt('🔐 Mot de passe (min 8 caractères): ');
    }
    if (!password || password.length < 8) {
        console.error('❌ Le mot de passe doit contenir au moins 8 caractères.');
        process.exit(1);
    }
    // Get name
    let nom = args.nom;
    if (!nom) {
        nom = await prompt('👤 Nom complet: ');
    }
    if (!nom) {
        nom = 'Super Admin';
    }
    // Confirm
    console.log('\n📋 Récapitulatif:');
    console.log(`   Email: ${email}`);
    console.log(`   Nom:   ${nom}`);
    console.log(`   Rôle:  Super Admin`);
    const confirm = await prompt('\nConfirmer la création ? (oui/non): ');
    if (confirm.toLowerCase() !== 'oui') {
        console.log('Opération annulée.');
        process.exit(0);
    }
    await createSuperAdmin({ email, password, nom });
}
main().catch(console.error);
