"use strict";
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
// backend/scripts/runSingleMigration.ts
// Usage: npx ts-node scripts/runSingleMigration.ts migrations/12_create_subscriptions.sql
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
async function runSingleMigration() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('❌ Usage: npx ts-node scripts/runSingleMigration.ts <path/to/migration.sql>');
        process.exit(1);
    }
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Fichier non trouvé: ${fullPath}`);
        process.exit(1);
    }
    const client = await pool.connect();
    try {
        console.log(`🔌 Connexion à la base de données...`);
        console.log(`📄 Exécution de: ${fullPath}`);
        const sql = fs.readFileSync(fullPath, 'utf8');
        await client.query(sql);
        console.log('✅ Migration exécutée avec succès!');
    }
    catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
    finally {
        client.release();
        await pool.end();
    }
}
runSingleMigration();
