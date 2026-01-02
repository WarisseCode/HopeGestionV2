"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Node 18+ has native fetch. If on older node, this might fail, but standard mostly is 18+ now.
// We use a small helper to mimic axios-like response
async function post(url, data, headers = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.message || res.statusText);
    return { data: json };
}
async function get(url, headers = {}) {
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.message || res.statusText);
    return { data: json };
}
const API_URL = 'http://localhost:5000/api';
const EMAIL = 'test_finance@hope.com';
const PASSWORD = 'password123';
async function runTest() {
    try {
        console.log('🚀 Démarrage du test Flux Financier & Mobile Money...');
        // 1. Setup User & Data
        console.log('1️⃣  Configuration des données de test...');
        const hashedPassword = await bcrypt_1.default.hash(PASSWORD, 10);
        // Create or Update Test User
        try {
            await index_1.pool.query(`
                INSERT INTO users (nom, email, password_hash, role, telephone, user_type)
                VALUES ('Test User', $1, $2, 'gestionnaire', '+22900000000', 'gestionnaire')
                ON CONFLICT (email) DO UPDATE SET password_hash = $2
                RETURNING id
            `, [EMAIL, hashedPassword]);
        }
        catch (e) {
            // Ignore if exists essentially (handled by ON CONFLICT usually but safe check)
        }
        // Get a valid Lease (Bail)
        const leaseRes = await index_1.pool.query('SELECT id FROM leases LIMIT 1');
        if (leaseRes.rows.length === 0) {
            // Create a dummy lease if none
            await index_1.pool.query(`INSERT INTO buildings (nom, type, adresse, ville, user_id) VALUES ('Imm Test', 'Maison', 'Cotonou', 'Cotonou', 1)`);
            const lotRes = await index_1.pool.query(`INSERT INTO lots (building_id, ref_lot, type, loyer_mensuel) VALUES ((SELECT id FROM buildings LIMIT 1), 'T1', 'Appart', 50000) RETURNING id`);
            const tRes = await index_1.pool.query(`INSERT INTO tenants (nom, prenoms, telephone_principal) VALUES ('Locataire', 'Test', '+22999999999') RETURNING id`);
            await index_1.pool.query(`INSERT INTO leases (lot_id, tenant_id, date_debut, loyer_actuel) VALUES ($1, $2, CURRENT_DATE, 50000)`, [lotRes.rows[0].id, tRes.rows[0].id]);
            console.log("⚠️  Bail de test créé.");
        }
        const leaseResFinal = await index_1.pool.query('SELECT id FROM leases LIMIT 1');
        const leaseId = leaseResFinal.rows[0].id;
        console.log(`✅ Utilisateur et Bail (ID: ${leaseId}) prêts.`);
        // 2. Login
        console.log('2️⃣  Connexion...');
        const loginRes = await post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Connecté. Token récupéré.');
        const authHeaders = { 'Authorization': `Bearer ${token}` };
        // 3. Create Payment (Loyer)
        console.log('3️⃣  Création d\'un Paiement de Loyer...');
        const paymentData = {
            lease_id: leaseId,
            montant: 50000,
            type: 'Loyer',
            mode_paiement: 'Mobile Money',
            date_paiement: new Date().toISOString(),
            reference_transaction: 'TRANS-TEST-001-' + Date.now()
        };
        const payRes = await post(`${API_URL}/paiements`, paymentData, authHeaders);
        console.log('✅ Paiement créé via API. ID:', payRes.data.id);
        // 4. Create Expense
        console.log('4️⃣  Enregistrement d\'une Dépense...');
        const expenseData = {
            amount: 15000,
            category: 'Entretien',
            description: 'Réparation Test Automatisé',
            supplier_name: 'Plombier Express',
            date_expense: new Date().toISOString()
        };
        const expRes = await post(`${API_URL}/depenses`, expenseData, authHeaders);
        console.log('✅ Dépense créée via API. ID:', expRes.data.id);
        // 5. Mobile Money Transaction
        console.log('5️⃣  Simulation Mobile Money...');
        const momoData = {
            amount: 2000,
            phoneNumber: '22997000000',
            operator: 'MTN',
            description: 'Test API MoMo'
        };
        const momoRes = await post(`${API_URL}/mobile-money/pay`, momoData, authHeaders);
        console.log('✅ Transaction MoMo initiée. Statut:', momoRes.data.status);
        // 6. Verify Dashboard Stats
        console.log('6️⃣  Vérification des Statistiques...');
        const statsRes = await get(`${API_URL}/paiements/stats`, authHeaders);
        console.log('📊 Stats Paiements:', statsRes.data);
        const expStatsRes = await get(`${API_URL}/depenses/stats`, authHeaders);
        console.log('📊 Stats Dépenses:', expStatsRes.data);
        console.log('🎉 TEST RÉUSSI ! Le flux backend Finance/MoMo est opérationnel.');
    }
    catch (error) {
        console.error('❌ ECHEC DU TEST:', error.message);
    }
    finally {
        process.exit();
    }
}
runTest();
//# sourceMappingURL=testFinanceFlow.js.map