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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars from backend/.env
dotenv.config({ path: path_1.default.resolve(__dirname, '../.env') });
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
async function debug() {
    try {
        console.log('--- DEBUG USER ROLE ---');
        const userRes = await pool.query(`SELECT id, email, role, user_type FROM users WHERE email = 'ayinla@gmail.com'`);
        if (userRes.rows.length === 0) {
            console.log('User ayinla@gmail.com NOT FOUND locally.');
        }
        else {
            console.log('User Found:', userRes.rows[0]);
            const userId = userRes.rows[0].id;
            console.log('\n--- DEBUG OWNER ACCESS ---');
            const accessRes = await pool.query(`SELECT * FROM owner_user WHERE user_id = $1`, [userId]);
            console.log(`Found ${accessRes.rows.length} owner_user links.`);
            accessRes.rows.forEach(row => {
                console.log(`- OwnerID: ${row.owner_id}, Role: ${row.role}, Active: ${row.is_active}`);
            });
        }
    }
    catch (err) {
        console.error('Error:', err);
    }
    finally {
        await pool.end();
    }
}
debug();
//# sourceMappingURL=debug_user.js.map