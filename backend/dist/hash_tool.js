"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/hash_tool.ts (Créer ce fichier temporaire)
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
const plainPassword = 'gestionnaire123'; // Votre mot de passe de test
bcrypt_1.default.hash(plainPassword, SALT_ROUNDS).then(hash => {
    console.log('Mot de passe à insérer dans la DB (Haché) :');
    console.log(hash);
    process.exit();
});
// Exécuter: ts-node backend/hash_tool.ts
//# sourceMappingURL=hash_tool.js.map