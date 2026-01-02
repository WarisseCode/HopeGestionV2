"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../db/database"));
async function seedPayments() {
    console.log('🌱 Seeding Payments...');
    try {
        // 1. Get existing leases
        const leasesRes = await database_1.default.query('SELECT * FROM leases');
        const leases = leasesRes.rows;
        if (leases.length === 0) {
            console.log('⚠️ No leases found. Please run seedLeases.ts first.');
            return;
        }
        console.log(`Found ${leases.length} leases.`);
        // 2. Generate payments for last 6 months
        const payments = [];
        const types = ['loyer', 'charges', 'depot_garantie'];
        const modes = ['especes', 'virement', 'mobile_money', 'cheque'];
        for (const lease of leases) {
            // Generate for last 6 months
            for (let i = 0; i < 6; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                date.setDate(5); // Paid on the 5th
                const isPaid = Math.random() > 0.1; // 90% paid
                if (!isPaid)
                    continue;
                const amount = parseFloat(lease.montant_loyer);
                payments.push({
                    lease_id: lease.id,
                    montant: amount,
                    type: 'loyer',
                    mode_paiement: modes[Math.floor(Math.random() * modes.length)],
                    date_paiement: date,
                    reference_transaction: `REF-${Math.floor(Math.random() * 100000)}`,
                    owner_id: lease.owner_id
                });
            }
        }
        // 3. Insert into DB
        for (const p of payments) {
            await database_1.default.query(`INSERT INTO payments 
                (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`, [p.lease_id, p.montant, p.type, p.mode_paiement, p.date_paiement, p.reference_transaction, p.owner_id]);
        }
        console.log(`✅ Automatically generated ${payments.length} payments/quittances.`);
    }
    catch (error) {
        console.error('Error seeding payments:', error);
    }
    finally {
        await database_1.default.end();
    }
}
seedPayments();
//# sourceMappingURL=seedPayments.js.map