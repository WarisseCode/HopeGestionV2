#!/usr/bin/env ts-node
/**
 * create_super_admin.ts
 * 
 * Script CLI sécurisé pour créer le Super Admin initial de la plateforme.
 * Usage: npx ts-node scripts/create_super_admin.ts --email=admin@example.com --password=SecureP@ss123
 * 
 * Ce script ne doit être exécuté qu'une seule fois lors du déploiement initial.
 */

import pool from '../db/database';
import bcrypt from 'bcrypt';
import * as readline from 'readline';

const SALT_ROUNDS = 10;

interface AdminData {
    email: string;
    password: string;
    nom: string;
}

async function prompt(question: string, hidden = false): Promise<string> {
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

function parseArgs(): Partial<AdminData> {
    const args: Partial<AdminData> = {};
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

async function checkExistingAdmin(): Promise<boolean> {
    const result = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    return parseInt(result.rows[0].count) > 0;
}

async function createSuperAdmin(data: AdminData) {
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
        const emailCheck = await pool.query("SELECT id FROM users WHERE email = $1", [data.email]);
        if (emailCheck.rows.length > 0) {
            console.error(`\n❌ Erreur: L'email ${data.email} est déjà utilisé.`);
            process.exit(1);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

        // Create admin user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, nom, role, user_type, statut, created_at)
             VALUES ($1, $2, $3, 'admin', 'admin', 'actif', NOW())
             RETURNING id, email, nom, role`,
            [data.email, hashedPassword, data.nom]
        );

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

    } catch (error: any) {
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
