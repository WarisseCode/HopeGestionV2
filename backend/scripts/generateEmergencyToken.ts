import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../db/database';

async function generateOrResetToken() {
    try {
        const customToken = process.argv[2];
        const rawToken = customToken 
            ? customToken.trim() 
            : `HOPE-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const hashed = await bcrypt.hash(rawToken, 10);

        await pool.query(
            `INSERT INTO system_settings (key, value, value_type, description, updated_at)
             VALUES ('maintenance_emergency_token', $1, 'string', 'Token de secours hashé pour désactiver la maintenance', NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [hashed]
        );

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║       NOUVEAU TOKEN DE SECOURS GÉNÉRÉ AVEC SUCCÈS            ║');
        console.log(`║   Clé  : ${rawToken.padEnd(52)}║`);
        console.log('║   URL  : https://hopegestion.com/maintenance/emergency       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la génération du token :', err);
        process.exit(1);
    }
}

generateOrResetToken();
