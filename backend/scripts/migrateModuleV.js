
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrateModuleV() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Module V - Locations Migration...');
    await client.query('BEGIN');

    // 1. Enhance leases table for payment frequency
    console.log('📋 Updating leases table...');
    await client.query(`
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS frequence_paiement VARCHAR(20) DEFAULT 'mensuel';
      COMMENT ON COLUMN leases.frequence_paiement IS 'mensuel, hebdomadaire, bimensuel, personnalise';
    `);
    await client.query(`ALTER TABLE leases ADD COLUMN IF NOT EXISTS next_payment_date DATE;`);
    console.log('  ✅ leases: frequence_paiement, next_payment_date added');

    // 2. Enhance payment_schedules for tracking
    console.log('📋 Updating payment_schedules table...');
    await client.query(`
      ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'en_attente';
      COMMENT ON COLUMN payment_schedules.statut IS 'en_attente, paye, partiel, retard, impaye';
    `);
    await client.query(`ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS montant_paye NUMERIC(12,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS date_reglement_final DATE;`);
    console.log('  ✅ payment_schedules: statut, montant_paye, date_reglement_final added');

    // 3. Link payments to schedules
    console.log('📋 Updating payments table...');
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES payment_schedules(id);`);
    console.log('  ✅ payments: schedule_id added');

    await client.query('COMMIT');
    console.log('✅ Module V Migration Complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateModuleV();
