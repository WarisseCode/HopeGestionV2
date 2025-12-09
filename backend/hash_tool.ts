// backend/hash_tool.ts (Créer ce fichier temporaire)
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const plainPassword = 'gestionnaire123'; // Votre mot de passe de test

bcrypt.hash(plainPassword, SALT_ROUNDS).then(hash => {
    console.log('Mot de passe à insérer dans la DB (Haché) :');
    console.log(hash);
    process.exit();
});

// Exécuter: ts-node backend/hash_tool.ts