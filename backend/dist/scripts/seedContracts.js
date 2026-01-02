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
// backend/scripts/seedContracts.ts
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const date_fns_1 = require("date-fns");
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
async function seedContracts() {
    try {
        console.log('🌱 Seeding Contracts...');
        // 1. Get a tenant and a lot
        const tenantRes = await pool.query("SELECT id FROM users WHERE email = 'locataire@gmail.com' LIMIT 1");
        const lotRes = await pool.query("SELECT id FROM lots LIMIT 1");
        if (tenantRes.rowCount === 0 || lotRes.rowCount === 0) {
            console.log('❌ Tenant or Lot not found. Run seed script first.');
            return;
        }
        const tenantId = tenantRes.rows[0].id;
        const lotId = lotRes.rows[0].id;
        // 2. Clear existing contracts for clean test
        await pool.query('DELETE FROM contracts');
        // 3. Create Contract 1: Expiring in 30 days (Should trigger Expiration Alert)
        const dateDebut1 = (0, date_fns_1.format)((0, date_fns_1.subMonths)(new Date(), 11), 'yyyy-MM-dd');
        const dateFin1 = (0, date_fns_1.format)((0, date_fns_1.addDays)(new Date(), 30), 'yyyy-MM-dd'); // Exactly 30 days from now
        await pool.query(`INSERT INTO contracts (reference, tenant_id, lot_id, date_debut, date_fin, loyer_mensuel, status) 
             VALUES ($1, $2, $3, $4, $5, 100000, 'actif')`, ['CTR-EXPIRE-30', tenantId, lotId, dateDebut1, dateFin1]);
        console.log('✅ Created Contract expiring in 30 days (CTR-EXPIRE-30)');
        // 4. Create Contract 2: Active, No payment for this month (Should trigger Late Payment Alert if date > 5th)
        // We simulate that rent is due on the 5th. Today is likely > 5th.
        const dateDebut2 = (0, date_fns_1.format)((0, date_fns_1.subMonths)(new Date(), 2), 'yyyy-MM-dd');
        const dateFin2 = (0, date_fns_1.format)((0, date_fns_1.addDays)(new Date(), 300), 'yyyy-MM-dd');
        await pool.query(`INSERT INTO contracts (reference, tenant_id, lot_id, date_debut, date_fin, loyer_mensuel, status) 
             VALUES ($1, $2, $3, $4, $5, 150000, 'actif')`, ['CTR-LATE-PAYMENT', tenantId, lotId, dateDebut2, dateFin2]);
        console.log('✅ Created Contract with potential late payment (CTR-LATE-PAYMENT)');
        console.log('✨ Contracts seeded successfully.');
    }
    catch (error) {
        console.error('❌ Error seeding contracts:', error);
    }
    finally {
        await pool.end();
    }
}
seedContracts();
//# sourceMappingURL=seedContracts.js.map